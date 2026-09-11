import { useState } from "react";
import { Outlet } from "react-router-dom";

import Sidebar from "../components/layout/Sidebar";
import Topbar from "../components/layout/Topbar";
import Footer from "../components/layout/Footer";

const AppLayout = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setSidebarCollapsed((current) => !current);
  };

  return (
    <div className="min-h-screen">
      <Topbar />

      <div className="flex items-start">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={toggleSidebar}
        />

        <div
          className={[
            "min-w-0 flex-1 transition-[margin] duration-300",
            "flex flex-col min-h-[calc(100vh-4rem)]",
            sidebarCollapsed
              ? "lg:ml-0"
              : "lg:ml-0",
          ].join(" ")}
        >
          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
            <Outlet />
          </main>

          <Footer />
        </div>
      </div>
    </div>
  );
};

export default AppLayout;