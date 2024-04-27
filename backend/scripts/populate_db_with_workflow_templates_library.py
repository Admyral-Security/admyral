import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.sql import text
import json
from datetime import datetime


async def async_main() -> None:
    engine = create_async_engine(os.environ["DATABASE_URL"], echo=True, future=True, pool_pre_ping=True)

    workflow_templates_library_directory = os.path.join(os.path.dirname(__file__), "..", "workflow-templates-library")

    queries = [
        (
            "workflow.json",
            text("""
                 INSERT INTO admyral.workflow (workflow_id, workflow_name, workflow_description, is_live, created_at, user_id, is_template)
                 VALUES (:workflow_id, :workflow_name, :workflow_description, :is_live, :created_at, :user_id, :is_template)
                 """)
        ),
        (
            "action_node.json",
            text("""
                 INSERT INTO admyral.action_node (action_id, workflow_id, action_name, reference_handle, action_type, action_description, action_definition, created_at, x_position, y_position)
                 VALUES (:action_id, :workflow_id, :action_name, :reference_handle, :action_type, :action_description, :action_definition, :created_at, :x_position, :y_position)
                 """)
        ),
        (
            "workflow_edge.json",
            text("""
                 INSERT INTO admyral.workflow_edge (parent_action_id, child_action_id, edge_type, parent_node_handle, child_node_handle)
                 VALUES (:parent_action_id, :child_action_id, :edge_type, :parent_node_handle, :child_node_handle)
                 """)
        ),
        (
            "workflow_template_metadata.json",
            text("""
                 INSERT INTO admyral.workflow_template_metadata (workflow_id, template_headline, template_description, category, icon)
                 VALUES (:workflow_id, :template_headline, :template_description, :category, :icon)
                 """)
        )
    ]

    for data_file_name, insert_query in queries:
        with open(os.path.join(workflow_templates_library_directory, data_file_name)) as f:
            workflow_data = json.load(f)

        for line in workflow_data:
            async with engine.begin() as conn:
                if "created_at" in line:
                    line["created_at"] = datetime.strptime(line["created_at"], "%Y-%m-%d %H:%M:%S.%f")
                if "action_definition" in line:
                    line["action_definition"] = json.dumps(line["action_definition"])
                try:
                    await conn.execute(insert_query, line)
                except Exception as e:
                    print(f"Failed to insert {str(line)} from {data_file_name} with error: {str(e)}")


if __name__ == "__main__":
    asyncio.run(async_main())