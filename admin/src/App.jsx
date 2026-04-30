import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Box, Typography } from '@strapi/design-system';
import HomePage from './pages/HomePage.jsx';

const App = () => {
  return (
    <>
      <Box padding={6} background="neutral0">
        <Typography variant="alpha">API Guard Pro</Typography>
        <Typography variant="omega" textColor="neutral600">
          Manage domains, resources, roles, policies, grants and user assignments
        </Typography>
      </Box>
      <Routes>
        <Route index element={<HomePage />} />
        <Route path="*" element={<HomePage />} />
      </Routes>
    </>
  );
};

export default App;
