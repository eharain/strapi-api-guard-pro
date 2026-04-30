import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Layout, Header } from '@strapi/design-system';
import Dashboard from './pages/Dashboard';
import Domains from './pages/Domains';
import Resources from './pages/Resources';
import Roles from './pages/Roles';
import Policies from './pages/Policies';
import Grants from './pages/Grants';
import Groups from './pages/Groups';
import Users from './pages/Users';
import Aliases from './pages/Aliases';
import Settings from './pages/Settings';
import Help from './pages/Help';

const App = () => {
  return (
    <Layout>
      <Routes>
        <Route index element={<Dashboard />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="domains/*" element={<Domains />} />
        <Route path="resources/*" element={<Resources />} />
        <Route path="roles/*" element={<Roles />} />
        <Route path="policies/*" element={<Policies />} />
        <Route path="grants/*" element={<Grants />} />
        <Route path="groups/*" element={<Groups />} />
        <Route path="users/*" element={<Users />} />
        <Route path="aliases/*" element={<Aliases />} />
        <Route path="settings/*" element={<Settings />} />
        <Route path="help/*" element={<Help />} />
      </Routes>
    </Layout>
  );
};

export default App;
