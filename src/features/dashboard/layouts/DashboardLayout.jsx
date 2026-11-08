import { Outlet } from "react-router";
import Sidebar from "../components/Sidebar";
// import Navbar from '../components/Navbar';

import './DashboardLayout.css';

const DashboardLayout = () => {
  console.log('hello');
  return (
    <div>
      <Sidebar/>

      <div className='ml-[250px] min-h-screen'>
        {/* <Navbar/> */}
        <main>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;