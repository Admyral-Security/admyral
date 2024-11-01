<p align="center">
<img src="img/banner.svg" alt="admyral" />
</p>

<div align="center">
  <div>
    <h3>
        <a href="https://docs.admyral.dev/"><strong>📚 Docs</strong></a> ·
        <a href="https://discord.gg/GqbJZT9Hbf"><strong>💬 Discord</strong></a> ·
        <a href="https://github.com/Admyral-Security/admyral-quickstart"><strong>🏎️ Quickstart</strong></a>
    </h3>
  </div>
  <div>

![Commit Activity](https://img.shields.io/github/commit-activity/m/Admyral-Security/admyral?style=flat-square&logo=github)
![License](https://img.shields.io/badge/License-Apache%202.0-blue?style=flat-square&logo=apache)

  </div>
</div>

</br>

## Quick start 🚀

Install Admyral:

```bash
$ pip install admyral
```

Start Admyral to access the frontend, automate and monitor controls using Admyral's scalable workflow infrastructure:

```bash
$ admyral up
```

> [!IMPORTANT]
> Admyral is built with Python 3.12 and requires Docker to be installed on your machine. \
> If you don't have Docker installed, you can download it [here](https://docs.docker.com/get-docker/). \
> If you don't have Python 3.12 installed, you can download it [here](https://www.python.org/downloads/) or use your favorite package manager (e.g., `brew`).

More instructions on self-hosting with Docker can be found [here](https://docs.admyral.dev/docker), and for the development setup, click [here](https://docs.admyral.dev/development_setup).

## Simple, reliable GRC Engineering using Admyral's Python SDK

### Automation-as-Code 🧑‍💻

<p align="center">
<img src="img/workflow.svg" alt="admyral" />
</p>

### AI Workflows 🤖

Empower your control monitoring and GRC workflows with AI! Admyral supports custom AI Actions using top-tier LLMs from OpenAI, Mistral, Anthropic, and more. You can use these AI Actions within your workflow to summarize findings, create a report, categorize alerts, and much more.

### No-Code Editor Sync -- Bi-directional 👈 👉

Admyral is hybrid. It offers the flexibility of code and the simplicity and speed of No-Code. Using the latter, visualize your codified controls and edit them directly in the drag-and-drop workflow builder. All changes are synced back into your code.

<img src="img/sync.svg" alt="admyral" />

### Workflow Monitoring 🔮

<img src="img/monitoring.svg" alt="admyral" />

### Reliable and Scalable Infrastructure Out-of-the-box 📦

Built on [Temporal](https://temporal.io/) (used by Netflix, Retool, and co.), Admyral ensures reliable, scalable workflows -- incl. secrets management for integrations.
Deploy in under 5 minutes without infrastructure or scalability worries.

### Start Automating Any Control or GRC Workflow 🎬

Make your _security grc operations_ more efficient and accomplish more with less resources.

When automating controls in _GRC_, reduce the effort for evidence collection and establish continuous control monitoring.

Example workflows/controls can be found in [examples/playbooks/workflows](https://github.com/Admyral-Security/admyral/tree/main/examples).

## 📃 License

This repository is licensed under Apache License 2.0. See [LICENSE](https://github.com/Admyral-Security/admyral/blob/main/LICENSE) for more details.

## Misc

### Telemetry

Admyral automatically collects telemetry data using PostHog with hosting in the EU. We want to emphasize that no personal data is sent to PostHog. The data helps us to understand how Admyral is used and improve our most relevant features as well as track the overall usage for internal and external reporting.

None of data is shared with third parties and does not include any sensitive information. If you would like to opt-out of telemetry or have questions, please reach out to us via [chris@admyral.ai](mailto:chris@admyral.ai) or contact us on Discord, as we want to be transparent and respect your privacy.

You can opt-out by simply setting `ADMYRAL_DISABLE_TELEMETRY` to `true` in your environment variables.
