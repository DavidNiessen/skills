"""Read-only cue drafts for constant-tempo 4/4 music. See references/method.md."""
import pathlib,json,argparse,subprocess
import numpy as np
from scipy import ndimage,signal
CACHE=pathlib.Path('audio-cache')
EXCLUDED=set()

def features(track):
    source=pathlib.Path(track['location']).resolve();stat=source.stat()
    identity={'path':str(source),'size':stat.st_size,'mtime_ns':stat.st_mtime_ns,'version':1}
    CACHE.mkdir(parents=True,exist_ok=True)
    dest=CACHE/f"{track['id']}.npz";manifest=dest.with_suffix('.json')
    if dest.exists() and manifest.exists() and json.loads(manifest.read_text())==identity:
        with np.load(dest) as saved:return {k:saved[k].copy() for k in saved.files}
    decoded=subprocess.run(['ffmpeg','-v','error','-i',str(source),'-ac','1','-ar','8000','-f','s16le','pipe:1'],capture_output=True,check=True)
    x=np.frombuffer(decoded.stdout,dtype='<i2').astype('float32')/32768
    vals={}
    for name,band in [('low',(35,180)),('high',(250,3000))]:
        y=signal.sosfiltfilt(signal.butter(3,band,fs=8000,btype='bandpass',output='sos'),x)
        vals[name+'_env']=np.sqrt(np.maximum(ndimage.uniform_filter1d(y*y,25),0))[::16].astype('float32')
    np.savez_compressed(dest,**vals);manifest.write_text(json.dumps(identity),encoding='utf-8')
    return vals

def runs(mask):
    changes=np.diff(np.r_[False,mask,False].astype(int))
    return list(zip(np.flatnonzero(changes==1),np.flatnonzero(changes==-1)))

def analyze(t):
    out={'id':t['id'],'artist':t['artist'],'title':t['title'],'location':t['location'],'cues':[],'review':[]}
    p=pathlib.Path(t['location']); markers=t['tempomarkers']
    if not p.is_file():return dict(out,status='unavailable',review=['Local audio unavailable'])
    if len(markers)!=1:return dict(out,status='review',review=['Segmented grid requires separate phrase analysis'])
    bpm=markers[0]['bpm']; anchor=markers[0]['startTime']
    if not np.isfinite(bpm) or bpm<=0:return dict(out,status='review',review=['Invalid BPM'])
    if t['id'] in EXCLUDED:return dict(out,status='review',review=['Excluded or unresolved grid'])
    f=features(t)
    beat=60/bpm; dur=len(f['low_env'])/500
    # Build full beats from the saved lattice, including beats before a relocated anchor.
    first=int(np.ceil(-anchor/beat)); last=int(np.floor((dur-anchor)/beat))
    times=anchor+np.arange(first,last+1)*beat
    if len(times)<65:return dict(out,status='review',review=['Too short for reliable phrase layout'])
    env=[]
    for key in ['low_env','high_env']:
        y=f[key]; cs=np.r_[0,np.cumsum(y,dtype=float)]
        ix=np.clip(np.rint(times*500).astype(int),0,len(y))
        z=np.diff(cs[ix])/np.maximum(np.diff(ix),1)
        env.append(z)
    env=np.asarray(env); n=env.shape[1]
    # Infer bar phase from repeated changes; grid beat alignment does not establish downbeats.
    log=np.log(np.maximum(env,1e-5))
    novelty=np.zeros(n)
    for i in range(1,n):novelty[i]=np.linalg.norm(log[:,i]-log[:,i-1])
    nov=novelty.copy(); nov[nov<np.percentile(nov,90)]=0
    scores=np.array([sum(nov[k::4]) for k in range(4)])
    if max(scores)<=1e-6:return dict(out,status='review',review=['No downbeat-change evidence'])
    phase=int(np.argmax(scores)); conf=float((np.max(scores)+1e-6)/(np.partition(scores,-2)[-2]+1e-6))
    starts=np.arange(phase,n-3,4); bt=times[starts]
    bars=np.array([np.mean(env[:,s:s+4],axis=1) for s in starts])
    if len(bars)<16:return dict(out,status='review',review=['Insufficient full bars'])
    low,high=bars.T
    lp=np.percentile(low,80); hp=np.percentile(high,80)
    if lp<.001 or hp<.001:return dict(out,status='review',review=['Weak rhythmic evidence'])
    active=(low>lp*.38)&(high>hp*.25)
    # Bridge fills of at most two bars, never sustained four-bar breaks.
    for s,e in runs(~active):
        if s>0 and e<len(active) and e-s<=2:active[s:e]=True
    groove=[(s,e) for s,e in runs(active) if e-s>=8]
    if not groove:return dict(out,status='review',review=['No sustained eight-bar groove detected'])
    if conf<1.08:return dict(out,status='review',review=['Weak inferred downbeat phase: audition before relying on phrase alignment'],phase_ratio=round(conf,3))
    def add(slot,name,index,color):
        if index<0 or index>=len(bt):return
        sec=round(float(bt[index]),6)
        if sec<0 or sec>=t['duration']:return
        out['cues'].append({'name':name,'type':'1','startTime':sec,'position':slot,'color':color})
    add(0,'MIX IN',groove[0][0],'green')
    drops=[]
    for s,e in groove:
        # Four or more low-bass bars before a sustained groove establishes a return.
        prior=s-1
        while prior>=0 and not active[prior]:prior-=1
        if s-prior-1>=4:drops.append((s,e,s-prior-1))
    firstdrop=drops[0] if drops else None
    context=(t['location']+' '+t['genre']).lower()
    style='trance' if 'trance' in context else ('house' if 'house' in context else ('hardcore' if 'uptempo' in context or 'hardcore' in t['location'].lower() else 'techno/bounce/other'))
    pre=32 if style in ['trance','house'] else (8 if dur<180 else 16)
    if firstdrop:
        s,e,length=firstdrop
        count=next((v for v in [pre,16,8] if v<=s and v<=length),None)
        if count:add(1,f'DROP 1 -{count} BARS',s-count,'yellow')
        add(2,'DROP 1',s,'red')
    # Main break: longest bass reduction between sustained groove sections after drop 1.
    choices=[]
    for s,e,length in drops:
        begin=s-length
        if firstdrop and s>firstdrop[0] and begin>=firstdrop[0]+8 and begin>=len(bt)*.2:
            choices.append((length,begin,s))
    if choices:
        length,begin,ret=max(choices)
        add(3,'MAIN BREAK',begin,'blue')
        count=next((v for v in [pre,16,8] if v<=length),None)
        if count:add(4,f'RETURN -{count} BARS',ret-count,'yellow')
        add(5,'DROP 2',ret,'red')
    else:out['review'].append('No confidently separated second drop/main break; corresponding slots empty')
    # End warnings count back from the final sustained bass-groove boundary, not file duration.
    s,e=groove[-1]
    for slot,count,color,name in [(6,16,'green','MIX OUT'),(7,8,'violet','EXIT')]:
        if e-s>=count:add(slot,f'{name} -{count} BARS',e-count,color)
    out.update(status='proposed',bpm=bpm,bar_phase=phase,phase_ratio=round(conf,3),style=style,
               groove_sections=[{'start':round(float(bt[s]),3),'end':round(float(times[int(starts[e-1])+4]),3),'bars':int(e-s)} for s,e in groove],
               evidence='Two-band beat-synchronous bass reduction/return; automatic draft, no listening or vocal verification')
    if len(out['cues'])<5:out['review'].append('Sparse layout: limited supported structural events')
    return out

def validate(cues,duration):
    used=set()
    for cue in cues:
        pos=cue['position'];time=cue['startTime']
        if isinstance(pos,bool) or not isinstance(pos,int) or pos not in range(8) or pos in used:raise ValueError('Invalid or duplicate cue position')
        if not isinstance(time,(float,int)) or isinstance(time,bool) or not np.isfinite(time) or not 0<=time<duration:raise ValueError('Cue outside audio')
        if cue['type']!='1' or cue['color'] not in {'green','yellow','red','blue','violet'}:raise ValueError('Unsupported draft cue type/colour')
        used.add(pos)

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--inventory',required=True,type=pathlib.Path)
    parser.add_argument('--cache',required=True,type=pathlib.Path)
    parser.add_argument('--output',required=True,type=pathlib.Path)
    parser.add_argument('--exclude-track',action='append',type=int,default=[])
    args=parser.parse_args();CACHE=args.cache;EXCLUDED=set(args.exclude_track)
    tracks=json.loads(args.inventory.read_text(encoding='utf-8'))
    if isinstance(tracks,dict):tracks=tracks['tracks']
    if len({t['id'] for t in tracks})!=len(tracks):raise ValueError('Duplicate inventory IDs')
    result=[]
    for i,t in enumerate(tracks):
        try:
            r=analyze(t)
            validate(r['cues'],t['duration'])
        except Exception as ex:r={'id':t['id'],'artist':t['artist'],'title':t['title'],'cues':[],'status':'error','review':[str(ex)]}
        result.append(r)
        if (i+1)%50==0:print(i+1,flush=True)
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(json.dumps(result,ensure_ascii=False,indent=2,allow_nan=False),encoding='utf-8')
    print('RESULT',len(result),'proposed',sum(r['status']=='proposed' for r in result),'cues',sum(len(r['cues']) for r in result),'review',sum(bool(r['review']) for r in result),flush=True)
