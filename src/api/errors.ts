// Typed API error (admin doc §22).
// Re-exports the teacher transport error under the spec name so both
// `ApiError` (admin doc) and `TeacherApiError` (existing imports) work.
// Behaviour: 400 validation, 404 reload/remove, 409 conflict (preserve
// form), 500 retryable, network failure offline/retry. Prefer
// response.error.message over generic text.
export { TeacherApiError as ApiError } from "./teacher/errors";
export { TeacherApiError } from "./teacher/errors";
