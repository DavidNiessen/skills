"""Synthetic behavioural checks; does not contact or write Lexicon."""
import unittest,tempfile,pathlib
from unittest.mock import patch
import numpy as np
import propose_cues as pc

class CueTests(unittest.TestCase):
    def test_sections_and_countdowns(self):
        # 128 BPM: intro 32 bars, break 16, groove 32, break 32, final groove 32.
        bpm=128;bar=240/bpm;bars=144;fr=500
        duration=bars*bar+.1
        low=np.full(int(duration*fr),.02);high=np.full_like(low,.1)
        for s,e in [(0,32),(48,80),(112,144)]:low[int(s*bar*fr):int(e*bar*fr)]=.4
        with tempfile.NamedTemporaryFile() as file:
            track={'id':1,'artist':'test','title':'test','location':file.name,'tempomarkers':[{'bpm':bpm,'startTime':0}],'duration':duration,'genre':'Hard Trance'}
            with patch.object(pc,'features',return_value={'low_env':low,'high_env':high}):out=pc.analyze(track)
        by={c['position']:c for c in out['cues']}
        self.assertEqual(out['status'],'proposed')
        self.assertAlmostEqual(by[2]['startTime'],48*bar,places=4)
        self.assertAlmostEqual(by[3]['startTime'],80*bar,places=4)
        self.assertAlmostEqual(by[5]['startTime'],112*bar,places=4)
        self.assertAlmostEqual(by[4]['startTime'],80*bar,places=4)
        self.assertAlmostEqual(by[6]['startTime'],128*bar,places=4)
        self.assertAlmostEqual(by[7]['startTime'],136*bar,places=4)
        pc.validate(out['cues'],duration)

    def test_no_negative_clamp_or_bad_numbers(self):
        base={'position':0,'startTime':0.,'type':'1','color':'green'}
        for value in [-.01,float('nan'),float('inf'),10.]:
            with self.assertRaises(ValueError):pc.validate([{**base,'startTime':value}],10)
        pc.validate([base,{**base,'position':1}],10)  # shared event is supported
        with self.assertRaises(ValueError):pc.validate([base,base],10)

    def test_missing_audio_declines(self):
        out=pc.analyze({'id':1,'artist':'x','title':'x','location':'missing-file-123.wav','tempomarkers':[]})
        self.assertEqual(out['status'],'unavailable');self.assertEqual(out['cues'],[])

if __name__=='__main__':unittest.main()
