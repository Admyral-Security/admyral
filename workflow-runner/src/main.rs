mod postgres;
mod server;
mod workflow;

use anyhow::Result;

#[tokio::main]
async fn main() -> Result<()> {
    let subscriber = tracing_subscriber::FmtSubscriber::new();
    tracing::subscriber::set_global_default(subscriber).expect("setting default subscriber failed");

    server::run_server().await?;

    /*

    Workflow:

    Webhook --> HTTP Request 1 --> HTTP Request 3
            --> HTTP Request 2


    1) setup workflow

    INSERT INTO workflows (workflow_name, workflow_description, is_live, user_id)
        VALUES
            ('my first workflow', 'some description', true, '728e8404-52c5-4f4e-9a65-5ffb3d00e042')
        RETURNING workflow_id

    2) define actions

    INSERT INTO actions (workflow_id, action_name, reference_handle, action_description, action_definition)
        VALUES
            ('a7871ed8-8996-404c-9343-09690e56fb6b', 'Webhook', 'webhook', 'blabla', '{"type": "Webhook", "payload": { "reference_handle": "webhook" }}'),
            ('a7871ed8-8996-404c-9343-09690e56fb6b', 'HTTP Request', 'http_request', 'blabla', '{"type": "HttpRequest", "payload": {"reference_handle": "http_request", "url": "https://1ec498973e1abe4622fd3dc2a9ecd62d.m.pipedream.net", "method": "Get", "headers": {"Content-Type": "application/json"}, "payload": {"message": "Hello from my automation"}}}')
        RETURNING action_id

    INSERT INTO workflow_edges
        VALUES
            ('dabb41f5-0d82-4ef1-a16b-2f8931601bd8', 'bfa78c83-5899-4df3-ae00-2f0178d4b0f1', 'a7871ed8-8996-404c-9343-09690e56fb6b', 'webhook', 'http_request')

    INSERT INTO webhooks (action_id) VALUES ('dabb41f5-0d82-4ef1-a16b-2f8931601bd8')

     */

    Ok(())
}
