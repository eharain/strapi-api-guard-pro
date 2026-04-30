import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Layout, Header } from '@strapi/design-system';
import HomePage from './pages/HomePage';

const App = () => {
  return (
    <Layout>
      <Header
        title="API Guard Pro"
        subtitle="Manage domains, resources, roles, policies, grants and user assignments"
      />
      <Routes>
        <Route index element={<HomePage />} />
        <Route path="*" element={<HomePage />} />
      </Routes>
    </Layout>
  );
};

export default App;
