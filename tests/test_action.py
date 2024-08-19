import pytest

from admyral.action import action


def test_duplicate_secret_placeholder():
    with pytest.raises(ValueError) as e:

        @action(
            display_name="My Custom Action",
            display_namespace="Custom Actions",
            secrets_placeholders=["MY_SECRET", "MY_SECRET"],
        )
        def custom_action():
            pass

    assert str(e.value) == "Secret placeholders must be unique."


#########################################################################################################


def test_stdlib_requirements():
    with pytest.raises(ValueError) as e:

        @action(
            display_name="My Custom Action",
            display_namespace="Custom Actions",
            requirements=["os"],
        )
        def custom_action():
            pass

    assert (
        str(e.value)
        == "Standard library module 'os' should not be added to requirements because they are by default accessible."
    )
