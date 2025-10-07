import React, { memo } from "react";

// Separate UserRow component
const UserRow = memo(({ user, onEdit, onDelete, onView }) => (
  
  <tr onClick={() => {
    console.log("User:", user);
    onView(user);
  }}  className="hover:bg-gray-50 cursor-pointer">
    <td className="px-4 py-2">{user.firstName} {user.lastName}</td>
    <td className="px-4 py-2">{user.uniqueId}</td>
    <td className="px-4 py-2">{user.mobileNo}</td>
    <td className="px-4 py-2">{user.email}</td>
    <td className="px-4 py-2">{user.companyId?.name || "N/A"}</td>
    <td className="px-4 py-2">{user.placeId?.name || "N/A"}</td>
    <td className="px-4 py-2"> 
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
        user.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
      }`}>
        {user.isActive ? "Active" : "Inactive"}
      </span>
    </td>
    <td className="px-4 py-2">
      <div className="flex gap-2">
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(user); }}
          className="text-indigo-600 hover:underline"
        >
          Edit
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(user._id); }}
          className="text-red-600 hover:underline"
        >
          Delete
        </button>
      </div>
    </td>
  </tr>
));

// Table Headers component
const TableHeaders = memo(() => (
  <tr>
    <th className="px-4 py-2 text-left">Name</th>
    <th className="px-4 py-2 text-left">ID</th>
    <th className="px-4 py-2 text-left">Phone</th>
    <th className="px-4 py-2 text-left">Email</th>
    <th className="px-4 py-2 text-left">Company</th>
    <th className="px-4 py-2 text-left">Place</th>
    <th className="px-4 py-2 text-left">Status</th>
    <th className="px-4 py-2 text-left">Actions</th>
  </tr>
));

// Main UserDetail component
const UserDetail = ({ users, onEdit, onDelete, onView }) => {
  if (!users || users.length === 0) {
    return <p className="text-gray-500 text-center">No users found.</p>;
  }

  return (
    <div className="bg-white shadow-md rounded-lg overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <TableHeaders />
        </thead>
        <tbody className="divide-y divide-gray-200">
          {Array.isArray(users) && users.filter(user => user && (user._id || user.uniqueId)).map((user) => (
            <UserRow
              key={`user-${user._id || user.uniqueId || Date.now()}-${user.firstName}-${user.lastName}`}
              user={user}
              onEdit={onEdit}
              onDelete={onDelete}
              onView={onView}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
};

UserDetail.displayName = 'UserDetail';
UserRow.displayName = 'UserRow';
TableHeaders.displayName = 'TableHeaders';

export default memo(UserDetail);
