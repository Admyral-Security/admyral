Thank you for contributing to Admyral!

- [ ] **PR title**: "package: description"
  - Where "package" is either of "app" or "docs" is being modified. E.g. use "docs: ..." for purely docs changes.
  - Example: "app: change button color"


- [ ] **PR message**: ***Delete this entire checklist*** and replace with
    - **Description:** a description of the change
    - **Issue:** the issue # it fixes, if applicable
    - **Dependencies:** any dependencies required for this change


- [ ] **Add tests and docs**: If you're adding a new integration, a new behavior, or feature, please include
  1. a test for the integration, preferably unit tests,
  2. add it to the documentation if applicable


- [ ] **Lint and test**: Please run the following lint and test commands before opening a PR:
Inside workflow-runner: `cargo fmt`  and `cargo test`
Inside backend: `poetry run pytest`
Inside web: `npm run lint`

Additional guidelines:
- Make sure optional dependencies are imported within a function.
- Changes should be backwards compatible.

If no one reviews your PR within a few days, please @-mention danielgrittner.