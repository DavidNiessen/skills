# Contributing to <PROJECT>

Thanks for wanting to help. Bug reports, ideas and pull requests are all welcome.

## Before you start

- **Bugs and ideas:** open an issue first, so we agree on the problem before anyone writes code. Use the templates: a bug report with steps to reproduce gets fixed far sooner.
- **Larger changes** (<EXAMPLES OF CHANGES THAT NEED A PLAN: a new data format, a public API change, …>): describe the plan in an issue and wait for a go-ahead.
- **Security problems:** do not open an issue; see [SECURITY.md](SECURITY.md).
- **Questions:** see [SUPPORT.md](SUPPORT.md).

## Setting up

You need <RUNTIME AND VERSION, e.g. Node.js 22 or newer> and <OTHER TOOLS>.

```bash
<INSTALL COMMAND>
<RUN/DEV COMMAND>    # <what it starts, and where>
```

## How the code fits together

| Path | What lives there |
|---|---|
| `<dir>` | <one sentence> |
| `<dir>` | <one sentence> |

## Checks

Pull requests run the same checks as [CI](.github/workflows/<ci>.yml). Run them before you push:

```bash
<TYPECHECK / LINT COMMAND>
<TEST COMMAND>
<BUILD COMMAND>
```

New behaviour comes with tests (<where tests live, how to run one>).

## <THE MOST COMMON CONTRIBUTION, e.g. "Adding a plugin">

1. <step with real file paths>
2. <step>
3. <how to check it, including any visual check>

## Style

- **Code:** <language, formatter, linter>. Follow the patterns already in the folder you work in.
- **Comments** say why, in plain sentences.
- **Commits** follow [Conventional Commits](https://www.conventionalcommits.org/): `feat(<scope>): …`, `fix(<scope>): …`, `docs: …`.

## Pull requests

1. Fork the repository and branch from `main`.
2. Keep a pull request to one change; small ones are reviewed quickly.
3. Fill in the template: what changes, why, and how you checked it (with a screenshot for anything visible).
4. Make sure the checks pass.

<HOW RELEASES HAPPEN, one or two sentences, or remove>

## Licence

<PROJECT> is licensed under the [<LICENCE NAME>](LICENSE). By submitting a contribution you agree that it is licensed under the same terms, and that you have the right to submit it.
