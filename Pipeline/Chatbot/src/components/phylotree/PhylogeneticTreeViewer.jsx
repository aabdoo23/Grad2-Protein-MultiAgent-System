import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Card from 'react-bootstrap/Card';
import Button from 'react-bootstrap/Button';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import PhylogeneticTreeTest from './PhylogeneticTreeTest';

const PhylogeneticTreeViewer = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [treeData, setTreeData] = useState(null);

  useEffect(() => {
    if (location.state?.newick) {
      setTreeData(location.state.newick);
    }
  }, [location.state]);

  const handleBack = () => {
    navigate(-1);
  };

  if (!treeData) {
    return (
      <div className="container-fluid py-4">
        <Card className="shadow-sm">
          <Card.Body className="text-center">
            <h4>No tree data available</h4>
            <Button variant="outline-primary" onClick={handleBack} className="mt-3">
              <FontAwesomeIcon icon={faArrowLeft} className="me-2" />
              Go Back
            </Button>
          </Card.Body>
        </Card>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4">
      <Card className="shadow-sm">
        <Card.Header className="d-flex justify-content-between align-items-center bg-primary text-white">
          <div className="d-flex align-items-center">
            <Button 
              variant="outline-light" 
              size="sm" 
              onClick={handleBack}
              className="me-3"
            >
              <FontAwesomeIcon icon={faArrowLeft} />
            </Button>
            <h4 className="mb-0">{location.state?.title || 'Phylogenetic Tree'}</h4>
          </div>
        </Card.Header>
        <Card.Body>
          <div className="tree-container" style={{ height: 'calc(100vh - 200px)', width: '100%' }}>
            <PhylogeneticTreeTest
              newick={treeData}
              width={window.innerWidth - 100}
              height={window.innerHeight - 200}
              padding={20}
              includeBLAxis={true}
            />
          </div>
        </Card.Body>
      </Card>
    </div>
  );
};

export default PhylogeneticTreeViewer; 