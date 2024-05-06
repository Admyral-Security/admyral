import pytest

from app.core.workflow_generation import parse_workflow_layout, Action, Connection


def get_scenario() -> dict:
    return {
        "actions": [
            {
                "action_id": "1",
                "action_type": "WEBHOOK",
                "action_name": "Start Workflow",
            },
            {
                "action_id": "2",
                "action_type": "HTTP_REQUEST",
                "action_name": "Search hash in VirusTotal"
            },
            {
                "action_id": "3",
                "action_type": "IF_CONDITION",
                "action_name": "Check if hash is malicious"
            },
            {
                "action_id": "4",
                "action_type": "SEND_EMAIL",
                "action_name": "Send hash is malicious email"
            },
            {
                "action_id": "5",
                "action_type": "SEND_EMAIL",
                "action_name": "Send hash is not malicious email"                
            }
        ],
        "connections": [
            {
                "source": "1",
                "target": "2",
                "connection_type": "DEFAULT"
            },
            {
                "source": "2",
                "target": "3",
                "connection_type": "DEFAULT"
            },
            {
                "source": "3",
                "target": "4",
                "connection_type": "TRUE"
            },
            {
                "source": "3",
                "target": "5",
                "connection_type": "FALSE"
            }
        ]
    }


def test__parse_workflow_layout__correct_workflow():
    model_output = get_scenario()
    expected_actions = [
        Action(action_id="1", action_type="WEBHOOK", action_name="Start Workflow"),
        Action(action_id="2", action_type="HTTP_REQUEST", action_name="Search hash in VirusTotal"),
        Action(action_id="3", action_type="IF_CONDITION", action_name="Check if hash is malicious"),
        Action(action_id="4", action_type="SEND_EMAIL", action_name="Send hash is malicious email"),
        Action(action_id="5", action_type="SEND_EMAIL", action_name="Send hash is not malicious email")
    ]
    expected_connections = [
        Connection(source="1", target="2", connection_type="DEFAULT"),
        Connection(source="2", target="3", connection_type="DEFAULT"),
        Connection(source="3", target="4", connection_type="TRUE"),
        Connection(source="3", target="5", connection_type="FALSE")
    ]

    parsed_workflow, error = parse_workflow_layout(model_output)
    
    assert error is None, "Error: Workflow layout parsing should not fail!"
    
    parsed_actions, parsed_connections = parsed_workflow
    assert parsed_actions == expected_actions, "Error: Actions are not parsed correctly!"
    assert parsed_connections == expected_connections, "Error: Connections are not parsed correctly!"


def test__parse_workflow_layout__actions_param_check():
    # test check that actions key must exist

    model_output = get_scenario()
    model_output.pop("actions")
    
    parsed_workflow, error = parse_workflow_layout(model_output)
    assert error == "Invalid input: Missing parameter 'actions'"
    assert parsed_workflow is None


def test__parse_workflow_layout__connections_param_check():
    # test check that connections key must exist

    model_output = get_scenario()
    model_output.pop("connections")

    parsed_workflow, error = parse_workflow_layout(model_output)
    assert error == "Invalid input: Missing parameter 'connections'"
    assert parsed_workflow is None


def test__parse_workflow_layout__action_correct_syntax_check():
    # test check that actions are verified to have the correct syntax

    # check for valid keys
    model_output = get_scenario()
    model_output["actions"][0].pop("action_id")

    parsed_workflow, error = parse_workflow_layout(model_output)
    assert error == f"Invalid action: {{'action_type': 'WEBHOOK', 'action_name': 'Start Workflow'}}. Action must have keys: 'action_id', 'action_type', 'action_name'"
    assert parsed_workflow is None

    # check for valid data types
    model_output = get_scenario()
    model_output["actions"][0]["action_id"] = 1
    
    parsed_workflow, error = parse_workflow_layout(model_output)
    assert error.startswith("Invalid action ({'action_id': 1, 'action_type': 'WEBHOOK', 'action_name': 'Start Workflow'}): ")
    assert parsed_workflow is None


def test__parse_workflow_layout__connections_correct_syntax_check():
    # test check that connections are verified to have the correct syntax

    # check for valid keys
    model_output = get_scenario()
    model_output["connections"][0].pop("source")

    parsed_workflow, error = parse_workflow_layout(model_output)
    assert error == f"Invalid connection: {{'target': '2', 'connection_type': 'DEFAULT'}}. Connection must have keys: 'source', 'target', 'connection_type'"
    assert parsed_workflow is None

    # check for valid data types
    model_output = get_scenario()
    model_output["connections"][0]["source"] = 1
    parsed_workflow, error = parse_workflow_layout(model_output)
    assert error.startswith("Invalid connection ({'source': 1, 'target': '2', 'connection_type': 'DEFAULT'}): ")
    assert parsed_workflow is None


def test__parse_workflow_layout__unique_action_ids_check():
    # test check that actions have a unique id

    model_output = get_scenario()
    model_output["actions"][1]["action_id"] = "1"
    
    parsed_workflow, error = parse_workflow_layout(model_output)
    assert error == "Duplicate action_id: \"1\""
    assert parsed_workflow is None


def test__parse_workflow_layout__correct_workflow_start_check():
    # test check that workflows begin with a WEBHOOK or MANUAL_START action

    model_output = get_scenario()
    model_output["actions"][0]["action_type"] = "HTTP_REQUEST"

    parsed_workflow, error = parse_workflow_layout(model_output)
    assert error == "No starting action found. Workflow must start with a WEBHOOK or MANUAL_START action"
    assert parsed_workflow is None


def test__parse_workflow_layout__valid_ids_in_connections_check():
    # test check that ids in connections are valid

    model_output = get_scenario()
    model_output["connections"][0]["source"] = "6"

    parsed_workflow, error = parse_workflow_layout(model_output)
    assert error == "Invalid connection (source=\"6\",target=\"2\"): Source action_id \"6\" does not exist"
    assert parsed_workflow is None

    model_output = get_scenario()
    model_output["connections"][0]["target"] = "6"

    parsed_workflow, error = parse_workflow_layout(model_output)
    assert error == "Invalid connection (source=\"1\",target=\"6\"): Target action_id \"6\" does not exist"
    assert parsed_workflow is None


def test__parse_workflow_layout__connection_types_check():
    # test check that connection types are valid
    
    model_output = get_scenario()
    model_output["connections"][0]["connection_type"] = "TRUE"

    parsed_workflow, error = parse_workflow_layout(model_output)
    assert error == "Invalid connection (source=\"1\",target=\"2\"): Source action_id \"1\" is not an IF_CONDITION action therefore the connection type must be DEFAULT"
    assert parsed_workflow is None

    model_output = get_scenario()
    model_output["connections"][2]["connection_type"] = "DEFAULT"

    parsed_workflow, error = parse_workflow_layout(model_output)
    assert error == "Invalid connection (source=\"3\",target=\"4\"): Source action_id \"3\" is an IF_CONDITION action therefore the connection type must be either TRUE or FALSE"
    assert parsed_workflow is None


def test__parse_workflow_layout__start_workflow_actions_no_incoming_edges():
    #  test check that start workflow actions (WEBHOOK, MANUAL_START) have no incoming edges
    
    model_output = get_scenario()
    model_output["connections"].append({
        "source": "2",
        "target": "1",
        "connection_type": "DEFAULT"
    })

    parsed_workflow, error = parse_workflow_layout(model_output)
    assert error == "Invalid connection (source=\"2\",target=\"1\"): Target action_id \"1\" is a WEBHOOK or MANUAL_START action and cannot be a target of a connection"
    assert parsed_workflow is None


def test__parse_workflow_layout__disconnected_components_check():
    # test check that we have single connected component
    
    model_output = get_scenario()
    model_output["connections"].pop(2)

    parsed_workflow, error = parse_workflow_layout(model_output)
    assert error == "Workflow has disconnected components"
    assert parsed_workflow is None
