use crate::protocol::common::ServerNotification;
use crate::protocol::v2::AutoReviewDecisionSource;
use crate::protocol::v2::CommandAction;
use crate::protocol::v2::CommandExecutionSource;
use crate::protocol::v2::CommandExecutionStatus;
use crate::protocol::v2::FileUpdateChange;
use crate::protocol::v2::GuardianApprovalReview;
use crate::protocol::v2::GuardianApprovalReviewStatus;
use crate::protocol::v2::ItemGuardianApprovalReviewCompletedNotification;
use crate::protocol::v2::ItemGuardianApprovalReviewStartedNotification;
use crate::protocol::v2::PatchApplyStatus;
use crate::protocol::v2::PatchChangeKind;
use crate::protocol::v2::ThreadItem;
use phobos_protocol::parse_command::ParsedCommand;
use phobos_protocol::protocol::ApplyPatchApprovalRequestEvent;
use phobos_protocol::protocol::ExecApprovalRequestEvent;
use phobos_protocol::protocol::ExecCommandBeginEvent;
use phobos_protocol::protocol::ExecCommandEndEvent;
use phobos_protocol::protocol::FileChange;
use phobos_protocol::protocol::GuardianAssessmentAction;
use phobos_protocol::protocol::GuardianAssessmentEvent;
use phobos_protocol::protocol::PatchApplyBeginEvent;
use phobos_protocol::protocol::PatchApplyEndEvent;
use phobos_shell_command::parse_command::parse_command;
use phobos_shell_command::parse_command::shlex_join;
use phobos_util_pathuri::PathConvention;
use phobos_util_pathuri::PathUri;
use std::collections::HashMap;
use std::path::PathBuf;
use tracing::warn;

pub fn build_file_change_approval_request_item(
    payload: &ApplyPatchApprovalRequestEvent,
) -> ThreadItem {
    ThreadItem::FileChange {
        id: payload.call_id.clone(),
        changes: convert_patch_changes(&payload.changes),
        status: PatchApplyStatus::InProgress,
    }
}

pub fn build_file_change_begin_item(payload: &PatchApplyBeginEvent) -> ThreadItem {
    ThreadItem::FileChange {
        id: payload.call_id.clone(),
        changes: convert_patch_changes(&payload.changes),
        status: PatchApplyStatus::InProgress,
    }
}

pub fn build_file_change_end_item(payload: &PatchApplyEndEvent) -> ThreadItem {
    ThreadItem::FileChange {
        id: payload.call_id.clone(),
        changes: convert_patch_changes(&payload.changes),
        status: (&payload.status).into(),
    }
}

pub fn build_command_execution_approval_request_item(
    payload: &ExecApprovalRequestEvent,
) -> ThreadItem {
    ThreadItem::CommandExecution {
        id: payload.call_id.clone(),
        command: shlex_join(&payload.command),
        cwd: payload.cwd.clone().into(),
        process_id: None,
        source: CommandExecutionSource::Agent,
        status: CommandExecutionStatus::InProgress,
        command_actions: payload
            .parsed_cmd
            .iter()
            .cloned()
            .map(|parsed| CommandAction::from_core_with_cwd(parsed, &payload.cwd))
            .collect(),
        aggregated_output: None,
        exit_code: None,
        duration_ms: None,
    }
}

pub fn build_command_execution_begin_item(payload: &ExecCommandBeginEvent) -> ThreadItem {
    let command_actions = command_actions_for_path_uri(&payload.parsed_cmd, &payload.cwd);
    ThreadItem::CommandExecution {
        id: payload.call_id.clone(),
        command: shlex_join(&payload.command),
        cwd: payload.cwd.clone().into(),
        process_id: payload.process_id.clone(),
        source: payload.source.into(),
        status: CommandExecutionStatus::InProgress,
        command_actions,
        aggregated_output: None,
        exit_code: None,
        duration_ms: None,
    }
}

pub fn build_command_execution_end_item(payload: &ExecCommandEndEvent) -> ThreadItem {
    let aggregated_output = if payload.aggregated_output.is_empty() {
        None
    } else {
        Some(payload.aggregated_output.clone())
    };
    let duration_ms = i64::try_from(payload.duration.as_millis()).unwrap_or(i64::MAX);
    let command_actions = command_actions_for_path_uri(&payload.parsed_cmd, &payload.cwd);

    ThreadItem::CommandExecution {
        id: payload.call_id.clone(),
        command: shlex_join(&payload.command),
        cwd: payload.cwd.clone().into(),
        process_id: payload.process_id.clone(),
        source: payload.source.into(),
        status: (&payload.status).into(),
        command_actions,
        aggregated_output,
        exit_code: Some(payload.exit_code),
        duration_ms: Some(duration_ms),
    }
}

fn command_actions_for_path_uri(parsed_cmd: &[ParsedCommand], cwd: &PathUri) -> Vec<CommandAction> {
    let native_cwd = if cwd.infer_path_convention() == Some(PathConvention::native()) {
        cwd.to_abs_path().ok()
    } else {
        None
    };

    parsed_cmd
        .iter()
        .cloned()
        .filter_map(|parsed| match parsed {
            ParsedCommand::Read { cmd, name, path } => match native_cwd.as_ref() {
                Some(native_cwd) => Some(CommandAction::Read {
                    command: cmd,
                    name,
                    path: native_cwd.join(path),
                }),
                None => {
                    warn!(
                        command = cmd,
                        %cwd,
                        "omitting read command action whose path cannot be resolved against a foreign cwd"
                    );
                    None
                }
            },
            ParsedCommand::ListFiles { cmd, path } => {
                Some(CommandAction::ListFiles { command: cmd, path })
            }
            ParsedCommand::Search { cmd, query, path } => Some(CommandAction::Search {
                command: cmd,
                query,
                path,
            }),
            ParsedCommand::Unknown { cmd } => Some(CommandAction::Unknown { command: cmd }),
        })
        .collect()
}

pub fn build_item_from_guardian_event(
    assessment: &GuardianAssessmentEvent,
    status: CommandExecutionStatus,
) -> Option<ThreadItem> {
    match &assessment.action {
        GuardianAssessmentAction::Command { command, cwd, .. } => {
            let id = assessment.target_item_id.as_ref()?;
            let command = command.clone();
            let command_actions = vec![CommandAction::Unknown {
                command: command.clone(),
            }];
            Some(ThreadItem::CommandExecution {
                id: id.clone(),
                command,
                cwd: cwd.clone().into(),
                process_id: None,
                source: CommandExecutionSource::Agent,
                status,
                command_actions,
                aggregated_output: None,
                exit_code: None,
                duration_ms: None,
            })
        }
        GuardianAssessmentAction::Execve {
            program, argv, cwd, ..
        } => {
            let id = assessment.target_item_id.as_ref()?;
            let argv = if argv.is_empty() {
                vec![program.clone()]
            } else {
                std::iter::once(program.clone())
                    .chain(argv.iter().skip(1).cloned())
                    .collect::<Vec<_>>()
            };
            let command = shlex_join(&argv);
            let parsed_cmd = parse_command(&argv);
            let command_actions = if parsed_cmd.is_empty() {
                vec![CommandAction::Unknown {
                    command: command.clone(),
                }]
            } else {
                parsed_cmd
                    .into_iter()
                    .map(|parsed| CommandAction::from_core_with_cwd(parsed, cwd))
                    .collect()
            };
            Some(ThreadItem::CommandExecution {
                id: id.clone(),
                command,
                cwd: cwd.clone().into(),
                process_id: None,
                source: CommandExecutionSource::Agent,
                status,
                command_actions,
                aggregated_output: None,
                exit_code: None,
                duration_ms: None,
            })
        }
        GuardianAssessmentAction::ApplyPatch { .. }
        | GuardianAssessmentAction::NetworkAccess { .. }
        | GuardianAssessmentAction::McpToolCall { .. }
        | GuardianAssessmentAction::RequestPermissions { .. } => None,
    }
}

pub fn guardian_auto_approval_review_notification(
    conversation_id: &String,
    event_turn_id: &str,
    assessment: &GuardianAssessmentEvent,
) -> ServerNotification {
    let turn_id = if assessment.turn_id.is_empty() {
        event_turn_id.to_string()
    } else {
        assessment.turn_id.clone()
    };
    let review = GuardianApprovalReview {
        status: match assessment.status {
            phobos_protocol::protocol::GuardianAssessmentStatus::InProgress => {
                GuardianApprovalReviewStatus::InProgress
            }
            phobos_protocol::protocol::GuardianAssessmentStatus::Approved => {
                GuardianApprovalReviewStatus::Approved
            }
            phobos_protocol::protocol::GuardianAssessmentStatus::Denied => {
                GuardianApprovalReviewStatus::Denied
            }
            phobos_protocol::protocol::GuardianAssessmentStatus::TimedOut => {
                GuardianApprovalReviewStatus::TimedOut
            }
            phobos_protocol::protocol::GuardianAssessmentStatus::Aborted => {
                GuardianApprovalReviewStatus::Aborted
            }
        },
        risk_level: assessment.risk_level.map(Into::into),
        user_authorization: assessment.user_authorization.map(Into::into),
        rationale: assessment.rationale.clone(),
    };
    let action = assessment.action.clone().into();
    match assessment.status {
        phobos_protocol::protocol::GuardianAssessmentStatus::InProgress => {
            ServerNotification::ItemGuardianApprovalReviewStarted(
                ItemGuardianApprovalReviewStartedNotification {
                    thread_id: conversation_id.to_string(),
                    turn_id,
                    review_id: assessment.id.clone(),
                    started_at_ms: assessment.started_at_ms,
                    target_item_id: assessment.target_item_id.clone(),
                    review,
                    action,
                },
            )
        }
        phobos_protocol::protocol::GuardianAssessmentStatus::Approved
        | phobos_protocol::protocol::GuardianAssessmentStatus::Denied
        | phobos_protocol::protocol::GuardianAssessmentStatus::TimedOut
        | phobos_protocol::protocol::GuardianAssessmentStatus::Aborted => {
            ServerNotification::ItemGuardianApprovalReviewCompleted(
                ItemGuardianApprovalReviewCompletedNotification {
                    thread_id: conversation_id.to_string(),
                    turn_id,
                    review_id: assessment.id.clone(),
                    started_at_ms: assessment.started_at_ms,
                    completed_at_ms: assessment
                        .completed_at_ms
                        .unwrap_or(assessment.started_at_ms),
                    target_item_id: assessment.target_item_id.clone(),
                    decision_source: assessment
                        .decision_source
                        .map(AutoReviewDecisionSource::from)
                        .unwrap_or(AutoReviewDecisionSource::Agent),
                    review,
                    action,
                },
            )
        }
    }
}

pub fn convert_patch_changes(changes: &HashMap<PathBuf, FileChange>) -> Vec<FileUpdateChange> {
    let mut converted: Vec<FileUpdateChange> = changes
        .iter()
        .map(|(path, change)| FileUpdateChange {
            path: path.to_string_lossy().into_owned(),
            kind: map_patch_change_kind(change),
            diff: format_file_change_diff(change),
        })
        .collect();
    converted.sort_by(|a, b| a.path.cmp(&b.path));
    converted
}

fn map_patch_change_kind(change: &FileChange) -> PatchChangeKind {
    match change {
        FileChange::Add { .. } => PatchChangeKind::Add,
        FileChange::Delete { .. } => PatchChangeKind::Delete,
        FileChange::Update { move_path, .. } => PatchChangeKind::Update {
            move_path: move_path.clone(),
        },
    }
}

fn format_file_change_diff(change: &FileChange) -> String {
    match change {
        FileChange::Add { content } => content.clone(),
        FileChange::Delete { content } => content.clone(),
        FileChange::Update {
            unified_diff,
            move_path,
        } => {
            if let Some(path) = move_path {
                format!("{unified_diff}\n\nMoved to: {}", path.display())
            } else {
                unified_diff.clone()
            }
        }
    }
}

#[cfg(test)]
#[path = "item_builders_tests.rs"]
mod tests;
