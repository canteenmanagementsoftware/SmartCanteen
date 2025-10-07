// src/components/Layout/AdminLayout.jsx
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

const AdminLayout = ({ children }) => {
  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 min-h-screen bg-gray-100 w-[100px]">
        <Topbar />
        <main className="p-4">{children}</main>
      </div>
    </div>
  );
};

export default AdminLayout;
