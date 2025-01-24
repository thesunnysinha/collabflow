import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import DocumentEditor from './components/DocumentEditor';
import Home from './components/Home';

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/document/:id" element={<DocumentEditor />} />
            </Routes>
        </Router>
    );
}

export default App;
