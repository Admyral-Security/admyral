# Access Review Automation

## Requirements

-   Retool
-   Slack

Visit our [documentation](https://docs.admyral.dev/) for setup instructions.

## Setup

1. Install all the dependencies:

```bash
$ poetry install
```

2. Make sure that an Admyral instance is running. If you are running Admyral locally, you also need use a tunneling servce like [ngrok](https://ngrok.com/) to expose the Admyral instance to the internet, so that you can receive events from Slack. If you are using ngrok and run Admyral locally on port 8000, simply run:

```bash
$ ngrok http 8000
```

Also, make sure to use the forwarding URL in the Slack API interactivity configuration as a domain.

3. Configure the Slack channel IDs in the following files (i.e., resolve the TODOs for `TODO(user)`):

-   `workflows/slack_interactivity.py`
-   `workflows/retool_access_review.py`

3. Push the custom Python actions:

```bash
$ admyral action push build_retool_inactivity_question_as_slack_messages -a workflows/retool_use_it_or_loose_it.py
$ admyral action push build_review_requests_as_slack_message_for_managers -a workflows/retool_access_review.py
```

4. Push the workflows:

```bash
admyral workflow push slack_interactivity -f workflows/slack_interactivity.py --activate
admyral workflow push retool_access_review -f workflows/retool_access_review.py --activate
admyral workflow push retool_use_it_or_loose_it -f workflows/retool_use_it_or_loose_it.py --activate
```

5. Test the workflows by triggering them manually:

```bash
$ admyral workflow trigger retool_access_review
$ admyral workflow trigger retool_use_it_or_loose_it
```
