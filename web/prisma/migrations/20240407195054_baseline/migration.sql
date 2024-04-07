-- CreateTable
CREATE TABLE "user_profiles" (
    "user_id" UUID NOT NULL,
    "email" TEXT NOT NULL,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "actions" (
    "action_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workflow_id" UUID NOT NULL,
    "action_name" TEXT NOT NULL,
    "reference_handle" TEXT NOT NULL,
    "action_description" TEXT NOT NULL,
    "action_definition" JSONB NOT NULL,

    CONSTRAINT "actions_pkey" PRIMARY KEY ("action_id")
);

-- CreateTable
CREATE TABLE "credentials" (
    "user_id" UUID NOT NULL,
    "credential_name" TEXT NOT NULL,
    "encrypted_secret" TEXT NOT NULL,

    CONSTRAINT "credentials_pkey" PRIMARY KEY ("user_id","credential_name")
);

-- CreateTable
CREATE TABLE "webhooks" (
    "webhook_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "action_id" UUID NOT NULL,
    "webhook_secret" TEXT NOT NULL,

    CONSTRAINT "webhooks_pkey" PRIMARY KEY ("webhook_id")
);

-- CreateTable
CREATE TABLE "workflow_edges" (
    "parent_action_id" UUID NOT NULL,
    "child_action_id" UUID NOT NULL,
    "workflow_id" UUID NOT NULL,
    "parent_reference_handle" TEXT NOT NULL,
    "child_reference_handle" TEXT NOT NULL,

    CONSTRAINT "workflow_edges_pkey" PRIMARY KEY ("parent_action_id","child_action_id")
);

-- CreateTable
CREATE TABLE "workflow_run_states" (
    "run_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workflow_id" UUID NOT NULL,
    "started_timestamp" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_updated_timestamp" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_timestamp" TIMESTAMP(6),
    "run_state" JSONB NOT NULL,

    CONSTRAINT "workflow_run_states_pkey" PRIMARY KEY ("run_id")
);

-- CreateTable
CREATE TABLE "workflows" (
    "workflow_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workflow_name" TEXT NOT NULL,
    "workflow_description" TEXT NOT NULL,
    "is_live" BOOLEAN NOT NULL,
    "user_id" UUID NOT NULL,

    CONSTRAINT "workflows_pkey" PRIMARY KEY ("workflow_id")
);

-- AddForeignKey
ALTER TABLE "actions" ADD CONSTRAINT "actions_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "workflows"("workflow_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "credentials" ADD CONSTRAINT "credentials_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_profiles"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "webhooks" ADD CONSTRAINT "webhooks_action_id_fkey" FOREIGN KEY ("action_id") REFERENCES "actions"("action_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "workflow_edges" ADD CONSTRAINT "workflow_edges_child_action_id_fkey" FOREIGN KEY ("child_action_id") REFERENCES "actions"("action_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "workflow_edges" ADD CONSTRAINT "workflow_edges_parent_action_id_fkey" FOREIGN KEY ("parent_action_id") REFERENCES "actions"("action_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "workflow_edges" ADD CONSTRAINT "workflow_edges_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "workflows"("workflow_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "workflow_run_states" ADD CONSTRAINT "workflow_run_states_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "workflows"("workflow_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "workflows" ADD CONSTRAINT "workflows_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_profiles"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;
