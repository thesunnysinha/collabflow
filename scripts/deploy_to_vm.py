import os
from vm_tool.runner import SetupRunner, SetupRunnerConfig, SSHConfig

config = SetupRunnerConfig(
    github_project_url='https://github.com/thesunnysinha/collabflow.git',
)

runner = SetupRunner(config)

ssh_configs = [
    SSHConfig(
        ssh_username=os.environ.get('GITHUB_SSH_USERNAME'),
        ssh_hostname=os.environ.get('GITHUB_SSH_HOSTNAME'),
        ssh_identity_file=os.environ.get('GITHUB_SSH_IDENTITY_FILE'),
    ),
]

runner.run_cloud_setup(ssh_configs)