/* oxlint-disable */
// AUTO GENERATED FILE
import { createUnionType, Field, ObjectType, registerEnumType } from '@nestjs/graphql';

import { UserFriendlyError } from './def';

export class InternalServerError extends UserFriendlyError {
  constructor(message?: string) {
    super('internal_server_error', 'internal_server_error', message);
  }
}

export class TooManyRequest extends UserFriendlyError {
  constructor(message?: string) {
    super('too_many_requests', 'too_many_request', message);
  }
}

export class NotFound extends UserFriendlyError {
  constructor(message?: string) {
    super('resource_not_found', 'not_found', message);
  }
}

export class BadRequest extends UserFriendlyError {
  constructor(message?: string) {
    super('bad_request', 'bad_request', message);
  }
}
@ObjectType()
class GraphqlBadRequestDataType {
  @Field() code!: string
  @Field() message!: string
}

export class GraphqlBadRequest extends UserFriendlyError {
  constructor(args: GraphqlBadRequestDataType, message?: string | ((args: GraphqlBadRequestDataType) => string)) {
    super('bad_request', 'graphql_bad_request', message, args);
  }
}
@ObjectType()
class QueryTooLongDataType {
  @Field() max!: number
}

export class QueryTooLong extends UserFriendlyError {
  constructor(args: QueryTooLongDataType, message?: string | ((args: QueryTooLongDataType) => string)) {
    super('invalid_input', 'query_too_long', message, args);
  }
}

export class UserNotFound extends UserFriendlyError {
  constructor(message?: string) {
    super('resource_not_found', 'user_not_found', message);
  }
}

export class UserAvatarNotFound extends UserFriendlyError {
  constructor(message?: string) {
    super('resource_not_found', 'user_avatar_not_found', message);
  }
}

export class EmailAlreadyUsed extends UserFriendlyError {
  constructor(message?: string) {
    super('resource_already_exists', 'email_already_used', message);
  }
}

export class SameEmailProvided extends UserFriendlyError {
  constructor(message?: string) {
    super('invalid_input', 'same_email_provided', message);
  }
}
@ObjectType()
class WrongSignInCredentialsDataType {
  @Field() email!: string
}

export class WrongSignInCredentials extends UserFriendlyError {
  constructor(args: WrongSignInCredentialsDataType, message?: string | ((args: WrongSignInCredentialsDataType) => string)) {
    super('invalid_input', 'wrong_sign_in_credentials', message, args);
  }
}
@ObjectType()
class UnknownOauthProviderDataType {
  @Field() name!: string
}

export class UnknownOauthProvider extends UserFriendlyError {
  constructor(args: UnknownOauthProviderDataType, message?: string | ((args: UnknownOauthProviderDataType) => string)) {
    super('invalid_input', 'unknown_oauth_provider', message, args);
  }
}

export class OauthStateExpired extends UserFriendlyError {
  constructor(message?: string) {
    super('bad_request', 'oauth_state_expired', message);
  }
}

export class InvalidOauthCallbackState extends UserFriendlyError {
  constructor(message?: string) {
    super('bad_request', 'invalid_oauth_callback_state', message);
  }
}
@ObjectType()
class MissingOauthQueryParameterDataType {
  @Field() name!: string
}

export class MissingOauthQueryParameter extends UserFriendlyError {
  constructor(args: MissingOauthQueryParameterDataType, message?: string | ((args: MissingOauthQueryParameterDataType) => string)) {
    super('bad_request', 'missing_oauth_query_parameter', message, args);
  }
}

export class OauthAccountAlreadyConnected extends UserFriendlyError {
  constructor(message?: string) {
    super('bad_request', 'oauth_account_already_connected', message);
  }
}
@ObjectType()
class InvalidEmailDataType {
  @Field() email!: string
}

export class InvalidEmail extends UserFriendlyError {
  constructor(args: InvalidEmailDataType, message?: string | ((args: InvalidEmailDataType) => string)) {
    super('invalid_input', 'invalid_email', message, args);
  }
}
@ObjectType()
class InvalidPasswordLengthDataType {
  @Field() min!: number
  @Field() max!: number
}

export class InvalidPasswordLength extends UserFriendlyError {
  constructor(args: InvalidPasswordLengthDataType, message?: string | ((args: InvalidPasswordLengthDataType) => string)) {
    super('invalid_input', 'invalid_password_length', message, args);
  }
}

export class PasswordRequired extends UserFriendlyError {
  constructor(message?: string) {
    super('invalid_input', 'password_required', message);
  }
}

export class WrongSignInMethod extends UserFriendlyError {
  constructor(message?: string) {
    super('invalid_input', 'wrong_sign_in_method', message);
  }
}

export class EarlyAccessRequired extends UserFriendlyError {
  constructor(message?: string) {
    super('action_forbidden', 'early_access_required', message);
  }
}

export class SignUpForbidden extends UserFriendlyError {
  constructor(message?: string) {
    super('action_forbidden', 'sign_up_forbidden', message);
  }
}

export class EmailTokenNotFound extends UserFriendlyError {
  constructor(message?: string) {
    super('invalid_input', 'email_token_not_found', message);
  }
}

export class InvalidEmailToken extends UserFriendlyError {
  constructor(message?: string) {
    super('invalid_input', 'invalid_email_token', message);
  }
}

export class LinkExpired extends UserFriendlyError {
  constructor(message?: string) {
    super('bad_request', 'link_expired', message);
  }
}

export class AuthenticationRequired extends UserFriendlyError {
  constructor(message?: string) {
    super('authentication_required', 'authentication_required', message);
  }
}

export class ActionForbidden extends UserFriendlyError {
  constructor(message?: string) {
    super('action_forbidden', 'action_forbidden', message);
  }
}

export class AccessDenied extends UserFriendlyError {
  constructor(message?: string) {
    super('no_permission', 'access_denied', message);
  }
}

export class EmailVerificationRequired extends UserFriendlyError {
  constructor(message?: string) {
    super('action_forbidden', 'email_verification_required', message);
  }
}
@ObjectType()
class WorkspacePermissionNotFoundDataType {
  @Field() spaceId!: string
}

export class WorkspacePermissionNotFound extends UserFriendlyError {
  constructor(args: WorkspacePermissionNotFoundDataType, message?: string | ((args: WorkspacePermissionNotFoundDataType) => string)) {
    super('resource_not_found', 'workspace_permission_not_found', message, args);
  }
}
@ObjectType()
class SpaceNotFoundDataType {
  @Field() spaceId!: string
}

export class SpaceNotFound extends UserFriendlyError {
  constructor(args: SpaceNotFoundDataType, message?: string | ((args: SpaceNotFoundDataType) => string)) {
    super('resource_not_found', 'space_not_found', message, args);
  }
}
@ObjectType()
class MemberNotFoundInSpaceDataType {
  @Field() spaceId!: string
}

export class MemberNotFoundInSpace extends UserFriendlyError {
  constructor(args: MemberNotFoundInSpaceDataType, message?: string | ((args: MemberNotFoundInSpaceDataType) => string)) {
    super('action_forbidden', 'member_not_found_in_space', message, args);
  }
}
@ObjectType()
class NotInSpaceDataType {
  @Field() spaceId!: string
}

export class NotInSpace extends UserFriendlyError {
  constructor(args: NotInSpaceDataType, message?: string | ((args: NotInSpaceDataType) => string)) {
    super('action_forbidden', 'not_in_space', message, args);
  }
}
@ObjectType()
class AlreadyInSpaceDataType {
  @Field() spaceId!: string
}

export class AlreadyInSpace extends UserFriendlyError {
  constructor(args: AlreadyInSpaceDataType, message?: string | ((args: AlreadyInSpaceDataType) => string)) {
    super('action_forbidden', 'already_in_space', message, args);
  }
}
@ObjectType()
class SpaceAccessDeniedDataType {
  @Field() spaceId!: string
}

export class SpaceAccessDenied extends UserFriendlyError {
  constructor(args: SpaceAccessDeniedDataType, message?: string | ((args: SpaceAccessDeniedDataType) => string)) {
    super('no_permission', 'space_access_denied', message, args);
  }
}
@ObjectType()
class SpaceOwnerNotFoundDataType {
  @Field() spaceId!: string
}

export class SpaceOwnerNotFound extends UserFriendlyError {
  constructor(args: SpaceOwnerNotFoundDataType, message?: string | ((args: SpaceOwnerNotFoundDataType) => string)) {
    super('internal_server_error', 'space_owner_not_found', message, args);
  }
}
@ObjectType()
class SpaceShouldHaveOnlyOneOwnerDataType {
  @Field() spaceId!: string
}

export class SpaceShouldHaveOnlyOneOwner extends UserFriendlyError {
  constructor(args: SpaceShouldHaveOnlyOneOwnerDataType, message?: string | ((args: SpaceShouldHaveOnlyOneOwnerDataType) => string)) {
    super('invalid_input', 'space_should_have_only_one_owner', message, args);
  }
}
@ObjectType()
class DocNotFoundDataType {
  @Field() spaceId!: string
  @Field() docId!: string
}

export class DocNotFound extends UserFriendlyError {
  constructor(args: DocNotFoundDataType, message?: string | ((args: DocNotFoundDataType) => string)) {
    super('resource_not_found', 'doc_not_found', message, args);
  }
}
@ObjectType()
class DocActionDeniedDataType {
  @Field() spaceId!: string
  @Field() docId!: string
  @Field() action!: string
}

export class DocActionDenied extends UserFriendlyError {
  constructor(args: DocActionDeniedDataType, message?: string | ((args: DocActionDeniedDataType) => string)) {
    super('no_permission', 'doc_action_denied', message, args);
  }
}
@ObjectType()
class VersionRejectedDataType {
  @Field() version!: string
  @Field() serverVersion!: string
}

export class VersionRejected extends UserFriendlyError {
  constructor(args: VersionRejectedDataType, message?: string | ((args: VersionRejectedDataType) => string)) {
    super('action_forbidden', 'version_rejected', message, args);
  }
}
@ObjectType()
class InvalidHistoryTimestampDataType {
  @Field() timestamp!: string
}

export class InvalidHistoryTimestamp extends UserFriendlyError {
  constructor(args: InvalidHistoryTimestampDataType, message?: string | ((args: InvalidHistoryTimestampDataType) => string)) {
    super('invalid_input', 'invalid_history_timestamp', message, args);
  }
}
@ObjectType()
class DocHistoryNotFoundDataType {
  @Field() spaceId!: string
  @Field() docId!: string
  @Field() timestamp!: number
}

export class DocHistoryNotFound extends UserFriendlyError {
  constructor(args: DocHistoryNotFoundDataType, message?: string | ((args: DocHistoryNotFoundDataType) => string)) {
    super('resource_not_found', 'doc_history_not_found', message, args);
  }
}
@ObjectType()
class BlobNotFoundDataType {
  @Field() spaceId!: string
  @Field() blobId!: string
}

export class BlobNotFound extends UserFriendlyError {
  constructor(args: BlobNotFoundDataType, message?: string | ((args: BlobNotFoundDataType) => string)) {
    super('resource_not_found', 'blob_not_found', message, args);
  }
}

export class ExpectToPublishDoc extends UserFriendlyError {
  constructor(message?: string) {
    super('invalid_input', 'expect_to_publish_doc', message);
  }
}

export class ExpectToRevokePublicDoc extends UserFriendlyError {
  constructor(message?: string) {
    super('invalid_input', 'expect_to_revoke_public_doc', message);
  }
}
@ObjectType()
class ExpectToGrantDocUserRolesDataType {
  @Field() spaceId!: string
  @Field() docId!: string
}

export class ExpectToGrantDocUserRoles extends UserFriendlyError {
  constructor(args: ExpectToGrantDocUserRolesDataType, message?: string | ((args: ExpectToGrantDocUserRolesDataType) => string)) {
    super('invalid_input', 'expect_to_grant_doc_user_roles', message, args);
  }
}
@ObjectType()
class ExpectToRevokeDocUserRolesDataType {
  @Field() spaceId!: string
  @Field() docId!: string
}

export class ExpectToRevokeDocUserRoles extends UserFriendlyError {
  constructor(args: ExpectToRevokeDocUserRolesDataType, message?: string | ((args: ExpectToRevokeDocUserRolesDataType) => string)) {
    super('invalid_input', 'expect_to_revoke_doc_user_roles', message, args);
  }
}
@ObjectType()
class ExpectToUpdateDocUserRoleDataType {
  @Field() spaceId!: string
  @Field() docId!: string
}

export class ExpectToUpdateDocUserRole extends UserFriendlyError {
  constructor(args: ExpectToUpdateDocUserRoleDataType, message?: string | ((args: ExpectToUpdateDocUserRoleDataType) => string)) {
    super('invalid_input', 'expect_to_update_doc_user_role', message, args);
  }
}

export class DocIsNotPublic extends UserFriendlyError {
  constructor(message?: string) {
    super('bad_request', 'doc_is_not_public', message);
  }
}

export class FailedToSaveUpdates extends UserFriendlyError {
  constructor(message?: string) {
    super('internal_server_error', 'failed_to_save_updates', message);
  }
}

export class FailedToUpsertSnapshot extends UserFriendlyError {
  constructor(message?: string) {
    super('internal_server_error', 'failed_to_upsert_snapshot', message);
  }
}

export class ActionForbiddenOnNonTeamWorkspace extends UserFriendlyError {
  constructor(message?: string) {
    super('action_forbidden', 'action_forbidden_on_non_team_workspace', message);
  }
}

export class DocDefaultRoleCanNotBeOwner extends UserFriendlyError {
  constructor(message?: string) {
    super('invalid_input', 'doc_default_role_can_not_be_owner', message);
  }
}

export class CanNotBatchGrantDocOwnerPermissions extends UserFriendlyError {
  constructor(message?: string) {
    super('invalid_input', 'can_not_batch_grant_doc_owner_permissions', message);
  }
}
@ObjectType()
class UnsupportedSubscriptionPlanDataType {
  @Field() plan!: string
}

export class UnsupportedSubscriptionPlan extends UserFriendlyError {
  constructor(args: UnsupportedSubscriptionPlanDataType, message?: string | ((args: UnsupportedSubscriptionPlanDataType) => string)) {
    super('invalid_input', 'unsupported_subscription_plan', message, args);
  }
}

export class FailedToCheckout extends UserFriendlyError {
  constructor(message?: string) {
    super('internal_server_error', 'failed_to_checkout', message);
  }
}

export class InvalidCheckoutParameters extends UserFriendlyError {
  constructor(message?: string) {
    super('invalid_input', 'invalid_checkout_parameters', message);
  }
}
@ObjectType()
class SubscriptionAlreadyExistsDataType {
  @Field() plan!: string
}

export class SubscriptionAlreadyExists extends UserFriendlyError {
  constructor(args: SubscriptionAlreadyExistsDataType, message?: string | ((args: SubscriptionAlreadyExistsDataType) => string)) {
    super('resource_already_exists', 'subscription_already_exists', message, args);
  }
}

export class InvalidSubscriptionParameters extends UserFriendlyError {
  constructor(message?: string) {
    super('invalid_input', 'invalid_subscription_parameters', message);
  }
}
@ObjectType()
class SubscriptionNotExistsDataType {
  @Field() plan!: string
}

export class SubscriptionNotExists extends UserFriendlyError {
  constructor(args: SubscriptionNotExistsDataType, message?: string | ((args: SubscriptionNotExistsDataType) => string)) {
    super('resource_not_found', 'subscription_not_exists', message, args);
  }
}

export class SubscriptionHasBeenCanceled extends UserFriendlyError {
  constructor(message?: string) {
    super('action_forbidden', 'subscription_has_been_canceled', message);
  }
}

export class SubscriptionHasNotBeenCanceled extends UserFriendlyError {
  constructor(message?: string) {
    super('action_forbidden', 'subscription_has_not_been_canceled', message);
  }
}

export class SubscriptionExpired extends UserFriendlyError {
  constructor(message?: string) {
    super('action_forbidden', 'subscription_expired', message);
  }
}
@ObjectType()
class SameSubscriptionRecurringDataType {
  @Field() recurring!: string
}

export class SameSubscriptionRecurring extends UserFriendlyError {
  constructor(args: SameSubscriptionRecurringDataType, message?: string | ((args: SameSubscriptionRecurringDataType) => string)) {
    super('bad_request', 'same_subscription_recurring', message, args);
  }
}

export class CustomerPortalCreateFailed extends UserFriendlyError {
  constructor(message?: string) {
    super('internal_server_error', 'customer_portal_create_failed', message);
  }
}
@ObjectType()
class SubscriptionPlanNotFoundDataType {
  @Field() plan!: string
  @Field() recurring!: string
}

export class SubscriptionPlanNotFound extends UserFriendlyError {
  constructor(args: SubscriptionPlanNotFoundDataType, message?: string | ((args: SubscriptionPlanNotFoundDataType) => string)) {
    super('resource_not_found', 'subscription_plan_not_found', message, args);
  }
}

export class CantUpdateOnetimePaymentSubscription extends UserFriendlyError {
  constructor(message?: string) {
    super('action_forbidden', 'cant_update_onetime_payment_subscription', message);
  }
}

export class WorkspaceIdRequiredForTeamSubscription extends UserFriendlyError {
  constructor(message?: string) {
    super('invalid_input', 'workspace_id_required_for_team_subscription', message);
  }
}

export class WorkspaceIdRequiredToUpdateTeamSubscription extends UserFriendlyError {
  constructor(message?: string) {
    super('invalid_input', 'workspace_id_required_to_update_team_subscription', message);
  }
}

export class CopilotSessionNotFound extends UserFriendlyError {
  constructor(message?: string) {
    super('resource_not_found', 'copilot_session_not_found', message);
  }
}

export class CopilotSessionDeleted extends UserFriendlyError {
  constructor(message?: string) {
    super('action_forbidden', 'copilot_session_deleted', message);
  }
}

export class NoCopilotProviderAvailable extends UserFriendlyError {
  constructor(message?: string) {
    super('internal_server_error', 'no_copilot_provider_available', message);
  }
}

export class CopilotFailedToGenerateText extends UserFriendlyError {
  constructor(message?: string) {
    super('internal_server_error', 'copilot_failed_to_generate_text', message);
  }
}

export class CopilotFailedToCreateMessage extends UserFriendlyError {
  constructor(message?: string) {
    super('internal_server_error', 'copilot_failed_to_create_message', message);
  }
}

export class UnsplashIsNotConfigured extends UserFriendlyError {
  constructor(message?: string) {
    super('internal_server_error', 'unsplash_is_not_configured', message);
  }
}

export class CopilotActionTaken extends UserFriendlyError {
  constructor(message?: string) {
    super('action_forbidden', 'copilot_action_taken', message);
  }
}
@ObjectType()
class CopilotDocNotFoundDataType {
  @Field() docId!: string
}

export class CopilotDocNotFound extends UserFriendlyError {
  constructor(args: CopilotDocNotFoundDataType, message?: string | ((args: CopilotDocNotFoundDataType) => string)) {
    super('resource_not_found', 'copilot_doc_not_found', message, args);
  }
}
@ObjectType()
class CopilotMessageNotFoundDataType {
  @Field() messageId!: string
}

export class CopilotMessageNotFound extends UserFriendlyError {
  constructor(args: CopilotMessageNotFoundDataType, message?: string | ((args: CopilotMessageNotFoundDataType) => string)) {
    super('resource_not_found', 'copilot_message_not_found', message, args);
  }
}
@ObjectType()
class CopilotPromptNotFoundDataType {
  @Field() name!: string
}

export class CopilotPromptNotFound extends UserFriendlyError {
  constructor(args: CopilotPromptNotFoundDataType, message?: string | ((args: CopilotPromptNotFoundDataType) => string)) {
    super('resource_not_found', 'copilot_prompt_not_found', message, args);
  }
}

export class CopilotPromptInvalid extends UserFriendlyError {
  constructor(message?: string) {
    super('invalid_input', 'copilot_prompt_invalid', message);
  }
}
@ObjectType()
class CopilotProviderSideErrorDataType {
  @Field() provider!: string
  @Field() kind!: string
  @Field() message!: string
}

export class CopilotProviderSideError extends UserFriendlyError {
  constructor(args: CopilotProviderSideErrorDataType, message?: string | ((args: CopilotProviderSideErrorDataType) => string)) {
    super('internal_server_error', 'copilot_provider_side_error', message, args);
  }
}
@ObjectType()
class CopilotInvalidContextDataType {
  @Field() contextId!: string
}

export class CopilotInvalidContext extends UserFriendlyError {
  constructor(args: CopilotInvalidContextDataType, message?: string | ((args: CopilotInvalidContextDataType) => string)) {
    super('invalid_input', 'copilot_invalid_context', message, args);
  }
}
@ObjectType()
class CopilotContextFileNotSupportedDataType {
  @Field() fileName!: string
  @Field() message!: string
}

export class CopilotContextFileNotSupported extends UserFriendlyError {
  constructor(args: CopilotContextFileNotSupportedDataType, message?: string | ((args: CopilotContextFileNotSupportedDataType) => string)) {
    super('bad_request', 'copilot_context_file_not_supported', message, args);
  }
}
@ObjectType()
class CopilotFailedToModifyContextDataType {
  @Field() contextId!: string
  @Field() message!: string
}

export class CopilotFailedToModifyContext extends UserFriendlyError {
  constructor(args: CopilotFailedToModifyContextDataType, message?: string | ((args: CopilotFailedToModifyContextDataType) => string)) {
    super('internal_server_error', 'copilot_failed_to_modify_context', message, args);
  }
}
@ObjectType()
class CopilotFailedToMatchContextDataType {
  @Field() contextId!: string
  @Field() content!: string
  @Field() message!: string
}

export class CopilotFailedToMatchContext extends UserFriendlyError {
  constructor(args: CopilotFailedToMatchContextDataType, message?: string | ((args: CopilotFailedToMatchContextDataType) => string)) {
    super('internal_server_error', 'copilot_failed_to_match_context', message, args);
  }
}

export class BlobQuotaExceeded extends UserFriendlyError {
  constructor(message?: string) {
    super('quota_exceeded', 'blob_quota_exceeded', message);
  }
}

export class MemberQuotaExceeded extends UserFriendlyError {
  constructor(message?: string) {
    super('quota_exceeded', 'member_quota_exceeded', message);
  }
}

export class CopilotQuotaExceeded extends UserFriendlyError {
  constructor(message?: string) {
    super('quota_exceeded', 'copilot_quota_exceeded', message);
  }
}
@ObjectType()
class RuntimeConfigNotFoundDataType {
  @Field() key!: string
}

export class RuntimeConfigNotFound extends UserFriendlyError {
  constructor(args: RuntimeConfigNotFoundDataType, message?: string | ((args: RuntimeConfigNotFoundDataType) => string)) {
    super('resource_not_found', 'runtime_config_not_found', message, args);
  }
}
@ObjectType()
class InvalidRuntimeConfigTypeDataType {
  @Field() key!: string
  @Field() want!: string
  @Field() get!: string
}

export class InvalidRuntimeConfigType extends UserFriendlyError {
  constructor(args: InvalidRuntimeConfigTypeDataType, message?: string | ((args: InvalidRuntimeConfigTypeDataType) => string)) {
    super('invalid_input', 'invalid_runtime_config_type', message, args);
  }
}

export class MailerServiceIsNotConfigured extends UserFriendlyError {
  constructor(message?: string) {
    super('internal_server_error', 'mailer_service_is_not_configured', message);
  }
}

export class CannotDeleteAllAdminAccount extends UserFriendlyError {
  constructor(message?: string) {
    super('action_forbidden', 'cannot_delete_all_admin_account', message);
  }
}

export class CannotDeleteOwnAccount extends UserFriendlyError {
  constructor(message?: string) {
    super('action_forbidden', 'cannot_delete_own_account', message);
  }
}

export class CaptchaVerificationFailed extends UserFriendlyError {
  constructor(message?: string) {
    super('bad_request', 'captcha_verification_failed', message);
  }
}

export class InvalidLicenseSessionId extends UserFriendlyError {
  constructor(message?: string) {
    super('invalid_input', 'invalid_license_session_id', message);
  }
}

export class LicenseRevealed extends UserFriendlyError {
  constructor(message?: string) {
    super('action_forbidden', 'license_revealed', message);
  }
}

export class WorkspaceLicenseAlreadyExists extends UserFriendlyError {
  constructor(message?: string) {
    super('action_forbidden', 'workspace_license_already_exists', message);
  }
}

export class LicenseNotFound extends UserFriendlyError {
  constructor(message?: string) {
    super('resource_not_found', 'license_not_found', message);
  }
}

export class InvalidLicenseToActivate extends UserFriendlyError {
  constructor(message?: string) {
    super('bad_request', 'invalid_license_to_activate', message);
  }
}
@ObjectType()
class InvalidLicenseUpdateParamsDataType {
  @Field() reason!: string
}

export class InvalidLicenseUpdateParams extends UserFriendlyError {
  constructor(args: InvalidLicenseUpdateParamsDataType, message?: string | ((args: InvalidLicenseUpdateParamsDataType) => string)) {
    super('invalid_input', 'invalid_license_update_params', message, args);
  }
}
@ObjectType()
class WorkspaceMembersExceedLimitToDowngradeDataType {
  @Field() limit!: number
}

export class WorkspaceMembersExceedLimitToDowngrade extends UserFriendlyError {
  constructor(args: WorkspaceMembersExceedLimitToDowngradeDataType, message?: string | ((args: WorkspaceMembersExceedLimitToDowngradeDataType) => string)) {
    super('bad_request', 'workspace_members_exceed_limit_to_downgrade', message, args);
  }
}
@ObjectType()
class UnsupportedClientVersionDataType {
  @Field() clientVersion!: string
  @Field() requiredVersion!: string
}

export class UnsupportedClientVersion extends UserFriendlyError {
  constructor(args: UnsupportedClientVersionDataType, message?: string | ((args: UnsupportedClientVersionDataType) => string)) {
    super('action_forbidden', 'unsupported_client_version', message, args);
  }
}
export enum ErrorNames {
  INTERNAL_SERVER_ERROR,
  TOO_MANY_REQUEST,
  NOT_FOUND,
  BAD_REQUEST,
  GRAPHQL_BAD_REQUEST,
  QUERY_TOO_LONG,
  USER_NOT_FOUND,
  USER_AVATAR_NOT_FOUND,
  EMAIL_ALREADY_USED,
  SAME_EMAIL_PROVIDED,
  WRONG_SIGN_IN_CREDENTIALS,
  UNKNOWN_OAUTH_PROVIDER,
  OAUTH_STATE_EXPIRED,
  INVALID_OAUTH_CALLBACK_STATE,
  MISSING_OAUTH_QUERY_PARAMETER,
  OAUTH_ACCOUNT_ALREADY_CONNECTED,
  INVALID_EMAIL,
  INVALID_PASSWORD_LENGTH,
  PASSWORD_REQUIRED,
  WRONG_SIGN_IN_METHOD,
  EARLY_ACCESS_REQUIRED,
  SIGN_UP_FORBIDDEN,
  EMAIL_TOKEN_NOT_FOUND,
  INVALID_EMAIL_TOKEN,
  LINK_EXPIRED,
  AUTHENTICATION_REQUIRED,
  ACTION_FORBIDDEN,
  ACCESS_DENIED,
  EMAIL_VERIFICATION_REQUIRED,
  WORKSPACE_PERMISSION_NOT_FOUND,
  SPACE_NOT_FOUND,
  MEMBER_NOT_FOUND_IN_SPACE,
  NOT_IN_SPACE,
  ALREADY_IN_SPACE,
  SPACE_ACCESS_DENIED,
  SPACE_OWNER_NOT_FOUND,
  SPACE_SHOULD_HAVE_ONLY_ONE_OWNER,
  DOC_NOT_FOUND,
  DOC_ACTION_DENIED,
  VERSION_REJECTED,
  INVALID_HISTORY_TIMESTAMP,
  DOC_HISTORY_NOT_FOUND,
  BLOB_NOT_FOUND,
  EXPECT_TO_PUBLISH_DOC,
  EXPECT_TO_REVOKE_PUBLIC_DOC,
  EXPECT_TO_GRANT_DOC_USER_ROLES,
  EXPECT_TO_REVOKE_DOC_USER_ROLES,
  EXPECT_TO_UPDATE_DOC_USER_ROLE,
  DOC_IS_NOT_PUBLIC,
  FAILED_TO_SAVE_UPDATES,
  FAILED_TO_UPSERT_SNAPSHOT,
  ACTION_FORBIDDEN_ON_NON_TEAM_WORKSPACE,
  DOC_DEFAULT_ROLE_CAN_NOT_BE_OWNER,
  CAN_NOT_BATCH_GRANT_DOC_OWNER_PERMISSIONS,
  UNSUPPORTED_SUBSCRIPTION_PLAN,
  FAILED_TO_CHECKOUT,
  INVALID_CHECKOUT_PARAMETERS,
  SUBSCRIPTION_ALREADY_EXISTS,
  INVALID_SUBSCRIPTION_PARAMETERS,
  SUBSCRIPTION_NOT_EXISTS,
  SUBSCRIPTION_HAS_BEEN_CANCELED,
  SUBSCRIPTION_HAS_NOT_BEEN_CANCELED,
  SUBSCRIPTION_EXPIRED,
  SAME_SUBSCRIPTION_RECURRING,
  CUSTOMER_PORTAL_CREATE_FAILED,
  SUBSCRIPTION_PLAN_NOT_FOUND,
  CANT_UPDATE_ONETIME_PAYMENT_SUBSCRIPTION,
  WORKSPACE_ID_REQUIRED_FOR_TEAM_SUBSCRIPTION,
  WORKSPACE_ID_REQUIRED_TO_UPDATE_TEAM_SUBSCRIPTION,
  COPILOT_SESSION_NOT_FOUND,
  COPILOT_SESSION_DELETED,
  NO_COPILOT_PROVIDER_AVAILABLE,
  COPILOT_FAILED_TO_GENERATE_TEXT,
  COPILOT_FAILED_TO_CREATE_MESSAGE,
  UNSPLASH_IS_NOT_CONFIGURED,
  COPILOT_ACTION_TAKEN,
  COPILOT_DOC_NOT_FOUND,
  COPILOT_MESSAGE_NOT_FOUND,
  COPILOT_PROMPT_NOT_FOUND,
  COPILOT_PROMPT_INVALID,
  COPILOT_PROVIDER_SIDE_ERROR,
  COPILOT_INVALID_CONTEXT,
  COPILOT_CONTEXT_FILE_NOT_SUPPORTED,
  COPILOT_FAILED_TO_MODIFY_CONTEXT,
  COPILOT_FAILED_TO_MATCH_CONTEXT,
  BLOB_QUOTA_EXCEEDED,
  MEMBER_QUOTA_EXCEEDED,
  COPILOT_QUOTA_EXCEEDED,
  RUNTIME_CONFIG_NOT_FOUND,
  INVALID_RUNTIME_CONFIG_TYPE,
  MAILER_SERVICE_IS_NOT_CONFIGURED,
  CANNOT_DELETE_ALL_ADMIN_ACCOUNT,
  CANNOT_DELETE_OWN_ACCOUNT,
  CAPTCHA_VERIFICATION_FAILED,
  INVALID_LICENSE_SESSION_ID,
  LICENSE_REVEALED,
  WORKSPACE_LICENSE_ALREADY_EXISTS,
  LICENSE_NOT_FOUND,
  INVALID_LICENSE_TO_ACTIVATE,
  INVALID_LICENSE_UPDATE_PARAMS,
  WORKSPACE_MEMBERS_EXCEED_LIMIT_TO_DOWNGRADE,
  UNSUPPORTED_CLIENT_VERSION
}
registerEnumType(ErrorNames, {
  name: 'ErrorNames'
})

export const ErrorDataUnionType = createUnionType({
  name: 'ErrorDataUnion',
  types: () =>
    [GraphqlBadRequestDataType, QueryTooLongDataType, WrongSignInCredentialsDataType, UnknownOauthProviderDataType, MissingOauthQueryParameterDataType, InvalidEmailDataType, InvalidPasswordLengthDataType, WorkspacePermissionNotFoundDataType, SpaceNotFoundDataType, MemberNotFoundInSpaceDataType, NotInSpaceDataType, AlreadyInSpaceDataType, SpaceAccessDeniedDataType, SpaceOwnerNotFoundDataType, SpaceShouldHaveOnlyOneOwnerDataType, DocNotFoundDataType, DocActionDeniedDataType, VersionRejectedDataType, InvalidHistoryTimestampDataType, DocHistoryNotFoundDataType, BlobNotFoundDataType, ExpectToGrantDocUserRolesDataType, ExpectToRevokeDocUserRolesDataType, ExpectToUpdateDocUserRoleDataType, UnsupportedSubscriptionPlanDataType, SubscriptionAlreadyExistsDataType, SubscriptionNotExistsDataType, SameSubscriptionRecurringDataType, SubscriptionPlanNotFoundDataType, CopilotDocNotFoundDataType, CopilotMessageNotFoundDataType, CopilotPromptNotFoundDataType, CopilotProviderSideErrorDataType, CopilotInvalidContextDataType, CopilotContextFileNotSupportedDataType, CopilotFailedToModifyContextDataType, CopilotFailedToMatchContextDataType, RuntimeConfigNotFoundDataType, InvalidRuntimeConfigTypeDataType, InvalidLicenseUpdateParamsDataType, WorkspaceMembersExceedLimitToDowngradeDataType, UnsupportedClientVersionDataType] as const,
});
