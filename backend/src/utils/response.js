const createResponse = ({
  success,
  data = undefined,
  error = undefined,
  meta = undefined
}) => {
  const response = {
    success
  };

  if (data !== undefined) {
    response.data = data;
  }

  if (error !== undefined) {
    response.error = error;
  }

  if (meta !== undefined) {
    response.meta = meta;
  }

  return response;
};

export {
  createResponse
};