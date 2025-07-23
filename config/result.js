function createResult(error, data) {
  if (data) return createSuccessResult(data);
  else return createErrorResult(error);
}

function createErrorResult(error) {
  return { status: "error", error: error };
}

function createSuccessResult(data) {
  return { status: "success", data: data };
}

module.exports = { createResult, createErrorResult, createSuccessResult };
