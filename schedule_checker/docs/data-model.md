# 데이터 모델 초안

## User
- id
- name
- email
- timezone

## Task
- id
- title
- description
- status (todo / in_progress / done / blocked)
- priority (low / medium / high / urgent)
- due_at
- created_at
- updated_at
- owner_id (User)

## TaskAssignee
- id
- task_id (Task)
- assignee_id (User | Contact)
- role (owner / collaborator)

## Schedule
- id
- task_id (Task)
- start_at
- end_at
- timezone

## Notification
- id
- task_id (Task)
- type (summary / reminder / delay / suggestion)
- next_fire_at
- cadence (6h / 12h / 24h / custom)
- is_enabled

## Contact
- id
- name
- company
- email
- phone
- tags

## CopyReview
- id
- task_id (Task)
- input_text
- suggested_text
- tone (friendly / concise / formal)
- created_at

## DashboardMetric
- id
- user_id (User)
- date
- completion_rate
- delay_count
- focus_score
