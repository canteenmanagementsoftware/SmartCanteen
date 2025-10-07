import React from 'react';
import PropTypes from 'prop-types';

const Alert = ({ message, type = "success", onClose }) => {
  return (
    <div
      className={`mb-4 p-4 rounded-md relative ${
        type === "error" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
      }`}
    >
      {message}
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
        >
          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      )}
    </div>
  );
};

Alert.propTypes = {
  message: PropTypes.string.isRequired,
  type: PropTypes.oneOf(["success", "error"]),
  onClose: PropTypes.func
};

export default Alert;
