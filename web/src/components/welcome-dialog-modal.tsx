import {
	AlertDialog,
	Button,
	CheckboxGroup,
	Flex,
	Select,
	Text,
	TextField,
} from "@radix-ui/themes";

interface WelcomeDialogModalProps {
	open: boolean;
	userInformation: any;
	setUserInformation: (value: any) => void;
	roles: string[];
	checkboxes: string[];
	handleSave: () => void;
	isSaving: boolean;
	nextDisabled: boolean;
}

export default function WelcomeDialogModal({
	open,
	userInformation,
	setUserInformation,
	roles,
	checkboxes,
	handleSave,
	isSaving,
	nextDisabled,
}: WelcomeDialogModalProps) {
	return (
		<AlertDialog.Root open={open}>
			<AlertDialog.Content
				style={{
					width: "416px",
					padding: "24px",
				}}
			>
				<AlertDialog.Title>Welcome to Admyral 🥳</AlertDialog.Title>

				<Flex direction="column" gap="4">
					<Flex direction="column" gap="4">
						<Flex direction="column" gap="1">
							<Text weight="medium" size="3">
								Your Name
							</Text>
							<Flex direction="column" gap="0">
								<TextField.Root
									variant="surface"
									value={userInformation.name}
									onChange={(event) =>
										setUserInformation({
											...userInformation,
											name: event.target.value,
										})
									}
								/>
								<Flex justify="end">
									<Text size="1">Optional</Text>
								</Flex>
							</Flex>
						</Flex>

						<Flex direction="column" gap="1">
							<Text weight="medium" size="3">
								Your Company
							</Text>
							<Flex direction="column" gap="0">
								<TextField.Root
									variant="surface"
									value={userInformation.company}
									onChange={(event) =>
										setUserInformation({
											...userInformation,
											company: event.target.value,
										})
									}
								/>
								<Flex justify="end">
									<Text size="1">Optional</Text>
								</Flex>
							</Flex>
						</Flex>

						<Flex direction="column" gap="1">
							<Text weight="medium" size="3">
								What is your role?
							</Text>
							<Flex direction="column" gap="0">
								<Select.Root
									value={userInformation.role}
									onValueChange={(value) =>
										setUserInformation({
											...userInformation,
											role: value,
										})
									}
								>
									<Select.Trigger placeholder="Your Role" />
									<Select.Content>
										{roles.map((role) => (
											<Select.Item
												key={role}
												value={role}
											>
												{role}
											</Select.Item>
										))}
									</Select.Content>
								</Select.Root>

								<Flex justify="end">
									<Text size="1">Required</Text>
								</Flex>
							</Flex>
						</Flex>

						<Flex direction="column" gap="1">
							<Text weight="medium" size="3">
								Pick what fits best:
							</Text>
							<Flex direction="column" gap="0">
								<CheckboxGroup.Root
									value={userInformation.pick}
									onValueChange={(value) =>
										setUserInformation({
											...userInformation,
											pick: value,
										})
									}
								>
									{checkboxes.map((checkbox) => (
										<CheckboxGroup.Item value={checkbox}>
											{checkbox}
										</CheckboxGroup.Item>
									))}
								</CheckboxGroup.Root>
								<Flex justify="end">
									<Text size="1">Required</Text>
								</Flex>
							</Flex>
						</Flex>
					</Flex>

					<Flex justify="end">
						<Button
							loading={isSaving}
							disabled={nextDisabled}
							onClick={handleSave}
						>
							Save
						</Button>
					</Flex>
				</Flex>
			</AlertDialog.Content>
		</AlertDialog.Root>
	);
}
