import React, { Component } from "react";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";
import RBButton from "react-bootstrap/Button";
import ButtonGroup from "react-bootstrap/ButtonGroup";
import Card from "react-bootstrap/Card";
import Badge from "react-bootstrap/Badge";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { text } from "d3-fetch";
import { 
  faArrowLeft, faArrowUp, faArrowDown, faArrowRight,
  faSortAmountUp, faAlignRight, faAlignLeft, faInfoCircle,
  faTree, faCircleNodes, faRefresh, faEye, faEyeSlash
} from "@fortawesome/free-solid-svg-icons";
import Phylotree from "./phylotree/phylotree.jsx";

import "./phylotree/phylotree.css";

function Button(props) {
  return (<OverlayTrigger
    placement="top"
    overlay={<Tooltip>
      {props.title}
    </Tooltip>}
  >
    <RBButton
      variant={props.variant || "outline-secondary"}
      size="sm"
      className="m-1"
      {...props}
    >
      {props.children}
    </RBButton>
  </OverlayTrigger>);
}

function HorizontalExpansionButton(props) {
  return (<Button
    title="Expand horizontally"
    {...props}
  >
    <FontAwesomeIcon key={1} icon={faArrowLeft} />
    <FontAwesomeIcon key={2} icon={faArrowRight} />
  </Button>);
}

function HorizontalCompressionButton(props) {
  return (<Button
    title="Compress horizontally"
    {...props}
  >
    <FontAwesomeIcon key={1} icon={faArrowRight} />
    <FontAwesomeIcon key={2} icon={faArrowLeft} />
  </Button>);
}

function VerticalExpansionButton(props) {
  return (<Button
    title="Expand vertically"
    {...props}
  >
    <FontAwesomeIcon key={1} icon={faArrowUp} />
    <FontAwesomeIcon key={2} icon={faArrowDown} />
  </Button>);
}

function VerticalCompressionButton(props) {
  return (<Button
    title="Compress vertically"
    {...props}
  >
    <FontAwesomeIcon key={1} icon={faArrowDown} />
    <FontAwesomeIcon key={2} icon={faArrowUp} />
  </Button>);
}


function AscendingSortButton(props) {
  return (<Button
    title="Sort in ascending order"
    {...props}
  >
    <FontAwesomeIcon key={1} icon={faSortAmountUp} flip="vertical"/>
  </Button>);
}


function DescendingSortButton(props) {
  return (<Button
    title="Sort in descending order"
    {...props}
  >
    <FontAwesomeIcon key={1} icon={faSortAmountUp}/>
  </Button>);
}


function AlignTipsRightButton(props) {
  return (<Button
    title="Align tips to right"
    variant={props.active ? "primary" : "outline-secondary"}
    {...props}
  >
    <FontAwesomeIcon key={1} icon={faAlignRight}/>
  </Button>);
}


function AlignTipsLeftButton(props) {
  return (<Button
    title="Align tips to left"
    variant={props.active ? "primary" : "outline-secondary"}
    {...props}
  >
    <FontAwesomeIcon key={1} icon={faAlignLeft}/>
  </Button>);
}


class PhylogeneticTreeTest extends Component {
  constructor(props) {
    super(props);
    this.state = {
      tree: null,
      width: props.width || 500,
      height: props.height || 500,
      alignTips: "right",
      sort: null,
      internal: false,
      clickedBranch: null,
      showInfo: false
    };
  }
  componentDidMount() {
    text(this.props.newick)
      .then(newick => {
        this.setState({newick});
      });
  }
  toggleDimension(dimension, direction) {
    const new_dimension = this.state[dimension] +
      (direction === "expand" ? 40 : -40),
      new_state = {};
    new_state[dimension] = new_dimension;
    this.setState(new_state);
  }
  handleSort(direction) {
    this.setState({sort: direction});
  }
  alignTips(direction) {
    this.setState({alignTips: direction});
  }
  resetTree() {
    this.setState({
      width: 500,
      height: 500,
      alignTips: "right",
      sort: null,
      internal: false,
      clickedBranch: null
    });
  }
  render() {
    const { padding, newick } = this.props;
    const { width, height, clickedBranch, showInfo } = this.state;
    return (
      <div className="container-fluid py-3">
        <Card className="shadow-sm mb-4">
          <Card.Header className="d-flex justify-content-between align-items-center bg-primary text-white">
            <div className="d-flex align-items-center">
              <FontAwesomeIcon icon={faTree} className="me-2" />
              <h4 className="mb-0">Interactive Phylogenetic Tree Viewer</h4>
            </div>
            <Button 
              variant="outline-light" 
              title={showInfo ? "Hide Information" : "Show Information"}
              onClick={() => this.setState({showInfo: !showInfo})}
            >
              <FontAwesomeIcon icon={showInfo ? faEyeSlash : faEye} />
            </Button>
          </Card.Header>
          
          {showInfo && (
            <Card.Body className="bg-light">
              <h5><FontAwesomeIcon icon={faInfoCircle} className="me-2" />About this visualization</h5>
              <p className="mb-2">
                This interactive phylogenetic tree visualization shows the evolutionary relationships between sequences.
                You can:
              </p>
              <ul className="small">
                <li>Click on node labels to trace the path to the root and see the distance</li>
                <li>Resize the visualization using the expand/compress buttons</li>
                <li>Sort and change the layout of the tree</li>
                <li>Toggle internal node labels</li>
              </ul>
              <p className="mb-0 small text-muted">
                <strong>Current tree:</strong> {newick}
              </p>
            </Card.Body>
          )}
          
          <Card.Body>
            <div className="tree-controls mb-3 d-flex flex-wrap justify-content-between">
              <div>
                <ButtonGroup className="me-3">
                  <Button title="Reset Tree" variant="danger" onClick={() => this.resetTree()}>
                    <FontAwesomeIcon icon={faRefresh} />
                  </Button>
                  <HorizontalExpansionButton
                    onClick={()=>this.toggleDimension("width", "expand")}
                  />
                  <HorizontalCompressionButton
                    onClick={()=>this.toggleDimension("width", "compress")}
                  />
                  <VerticalExpansionButton
                    onClick={()=>this.toggleDimension("height", "expand")}
                  />
                  <VerticalCompressionButton
                    onClick={()=>this.toggleDimension("height", "compress")}
                  />
                </ButtonGroup>
              
                <ButtonGroup className="me-3">
                  <AscendingSortButton
                    onClick={()=>this.handleSort("ascending")}
                    variant={this.state.sort === "ascending" ? "primary" : "outline-secondary"}
                  />
                  <DescendingSortButton
                    onClick={()=>this.handleSort("descending")}
                    variant={this.state.sort === "descending" ? "primary" : "outline-secondary"}
                  />
                </ButtonGroup>
              
                <ButtonGroup>
                  <AlignTipsLeftButton
                    onClick={()=>this.alignTips("left")}
                    active={this.state.alignTips === "left"}
                  />
                  <AlignTipsRightButton
                    onClick={()=>this.alignTips("right")}
                    active={this.state.alignTips === "right"}
                  />
                </ButtonGroup>
              </div>
              
              <div className="form-check form-switch">
                <input
                  className="form-check-input"
                  type='checkbox'
                  id="internalLabelsToggle"
                  checked={this.state.internal}
                  onChange={()=>this.setState({internal: !this.state.internal})}
                />
                <label className="form-check-label" htmlFor="internalLabelsToggle">
                  <FontAwesomeIcon icon={faCircleNodes} className="me-1" />
                  {this.state.internal ? 'Hide' : 'Show'} internal labels
                </label>
              </div>
            </div>
            
            <div className="tree-container" style={{ height: `${height}px`, width: `${width}px`, overflow: 'auto' }}>
              <svg width={width} height={height}>
                <Phylotree
                  width={width-2*padding}
                  height={height-2*padding}
                  transform={`translate(${padding}, ${padding})`}
                  newick={newick}
                  alignTips={this.state.alignTips}
                  sort={this.state.sort}
                  internalNodeLabels={this.state.internal}
                  onBranchClick={branch => {
                    this.setState({clickedBranch: branch.target.data.name})
                  }}
                  includeBLAxis
                />
              </svg>
            </div>
            
            {clickedBranch && (
              <div className="mt-3">
                <Badge bg="info">
                  Last clicked branch was <strong>{clickedBranch}</strong>
                </Badge>
              </div>
            )}
          </Card.Body>
        </Card>
      </div>
    );
  }
}

PhylogeneticTreeTest.defaultProps = {
  padding: 10
};

export default PhylogeneticTreeTest;