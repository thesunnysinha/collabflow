import os
from vm_tool.runner import SetupRunner, SetupRunnerConfig, SSHConfig

config = SetupRunnerConfig(
    github_project_url='https://github.com/thesunnysinha/collabflow.git',
)

runner = SetupRunner(config)

ssh_configs = [
    SSHConfig(
        ssh_username=os.environ.get('SSH_USERNAME'),
        ssh_password=os.environ.get('SSH_PASSWORD'),
        ssh_hostname=os.environ.get('SSH_HOSTNAME'),
    ),
]

runner.run_cloud_setup(ssh_configs)