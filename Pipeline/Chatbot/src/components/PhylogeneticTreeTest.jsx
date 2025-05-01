import React, { Component } from "react";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";
import RBButton from "react-bootstrap/Button";
import ButtonGroup from "react-bootstrap/ButtonGroup";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faArrowLeft, faArrowUp, faArrowDown, faArrowRight,
  faSortAmountUp, faAlignRight, faAlignLeft
} from "@fortawesome/free-solid-svg-icons";
import { text } from "d3-fetch";
import Phylotree from "./phylotree/phylotree.jsx";

import "./phylotree/phylotree.css";
// const newick = '((A:0.1,B:0.2):0.3,(C:0.4,D:0.5):0.6);';
  const newick = '((((((((((((((((((((((((((XP_011542095:0.00000,(AAI01008:0.00000,(KAI2573154:0.00000,KAI4056764:0.00000)Inner70:0.00000)Inner71:0.00000)Inner72:0.00000,(KAI4056765:0.00000,(AAH66981:0.01667,((XP_063453232:0.00000,(XP_063647978:0.00000,XP_054953189:0.00000)Inner62:0.00000)Inner63:0.00781,((XP_063554977:0.01667,(PNI88336:0.00000,(XP_063651560:0.00000,PNI88338:0.00000)Inner64:0.00000)Inner65:0.00000)Inner66:0.00212,((XP_054523285:0.01073,(PNI11789:0.00000,PNI11790:0.00000)Inner5:0.00593)Inner40:0.02733,((((((KAI4001744:0.00000,(AAI48506:-0.00000,PNJ85075:0.01667)Inner3:-0.00000)Inner4:0.01626,(PNI13186:0.00000,(KAI2570024:0.00000,(KAI4059667:0.00000,(KAI2596555:0.00000,(AAS58873:0.00000,(KAI2570025:0.00000,(PNI13185:0.00000,KAI2570028:0.00000)Inner11:0.00000)Inner12:0.00000)Inner13:0.00000)Inner14:0.00000)Inner15:0.00000)Inner16:0.00000)Inner17:0.00041)Inner18:0.01585,(PNJ04514:0.00000,(XP_054199680:0.00000,(AAS58865:0.00000,(XP_063508522:0.00000,(XP_054387931:0.00000,(KAI4036267:0.00000,(XP_063508523:0.00000,(ABP57734:0.00000,(XP_054188860:0.00000,(XP_054535689:0.00000,(KAI2525035:0.00000,(KAI4036190:0.00000,(NP_001093241:0.00000,(KAI2525036:0.00000,(KAI4036191:0.00000,(KAI2525096:0.00000,(AAS58867:0.00000,(AAS58862:0.00000,PNJ04513:0.00000)Inner20:0.00000)Inner21:0.00000)Inner22:0.00000)Inner23:0.00000)Inner24:0.00000)Inner25:0.00000)Inner26:0.00000)Inner27:0.00000)Inner28:0.00000)Inner29:0.00000)Inner30:0.00000)Inner31:0.00000)Inner32:0.00000)Inner33:0.00000)Inner34:0.00000)Inner35:0.00000)Inner36:0.00000)Inner37:0.00082)Inner38:0.00375,((XP_070935008:0.00591,(XP_028683323:0.00000,(XP_028683894:0.00000,EHH19994:0.00000)Inner1:0.00000)Inner2:0.01075)Inner6:0.01042,(KAL4833100:0.00000,(KAL4680676:0.00000,(XP_030782219:0.00000,(XP_030782250:-0.00000,KAL4825989:0.01667)Inner7:-0.00000)Inner8:-0.00000)Inner9:-0.00000)Inner10:0.00625)Inner19:0.01292)Inner39:0.05464,(XP_054531166:0.00000,(KAI4045716:0.00000,(XP_054531165:0.00000,(KAI2586272:0.00000,(NP_001131143:0.00000,(AAI40941:0.00000,(KAI4045715:0.00000,(KAI2586274:0.00000,KAI2586273:0.00000)Inner51:0.00000)Inner52:0.00000)Inner53:0.00000)Inner54:0.00000)Inner55:0.00000)Inner56:0.00000)Inner57:0.00000)Inner58:0.00786)Inner59:0.00067,((KAI2595764:0.00000,(NP_001244291:0.00000,(NP_778146:0.00000,(XP_006724060:0.00000,(KAI2595765:0.00000,(XP_006709993:0.00000,(XP_011527852:0.00000,(XP_011543957:0.00000,XP_011543958:0.00000)Inner41:0.00000)Inner42:0.00000)Inner43:0.00000)Inner44:0.00000)Inner45:0.00000)Inner46:0.00000)Inner47:0.00000)Inner48:0.01667,(EAW50512:0.00000,EAW50513:0.00000)Inner49:0.00000)Inner50:0.00767)Inner60:0.00288)Inner61:0.00778)Inner67:0.00573)Inner68:0.00885)Inner69:0.00000)Inner73:0.00000)Inner74:0.00000,XP_054188543:0.00000)Inner75:0.00000,XP_054233143:0.00000)Inner76:0.00000,KAI2573153:0.00000)Inner77:0.00000,KAI4056758:0.00000)Inner78:0.00000,XP_016877342:0.00000)Inner79:0.00000,XP_054233142:0.00000)Inner80:0.00000,KAI4056759:0.00000)Inner81:0.00000,XP_006720417:0.00000)Inner82:0.00000,XP_011544501:0.00000)Inner83:0.00000,XP_011544502:0.00000)Inner84:0.00000,XP_011542098:0.00000)Inner85:0.00000,KAI2573148:0.00000)Inner86:0.00000,XP_006724964:0.00000)Inner87:0.00000,XP_047288063:0.00000)Inner88:0.00000,XP_011542099:0.00000)Inner89:0.00000,KAI4056757:0.00000)Inner90:0.00000,NP_001264232:0.00000)Inner91:0.00000,AAS58869:0.00000)Inner92:0.00000,AAI01006:0.00000)Inner93:0.00000,XP_054233141:0.00000)Inner94:0.00000,NP_001382398:0.00000)Inner95:0.00000,NP_997238:0.00000)Inner96:0.00000,AAI27124:0.00000)Inner97:0.00000,KAI2573146:0.00000,XP_054188546:0.00000)Inner98:0.00000;';


function Button(props) {
  return (<OverlayTrigger
    placement="top"
    overlay={<Tooltip>
      {props.title}
    </Tooltip>}
  >
    <RBButton
      variant="secondary"
      {...props}
    >
      {props.children}
    </RBButton>
  </OverlayTrigger>);
}

function HorizontalExpansionButton(props) {
  return (<Button
    style={{ fontSize: 10 }}
    title="Expand horizontally"
    {...props}
  >
    <FontAwesomeIcon key={1} icon={faArrowLeft} />
    <FontAwesomeIcon key={2} icon={faArrowRight} />
  </Button>);
}

function HorizontalCompressionButton(props) {
  return (<Button
    style={{ fontSize: 10 }}
    title="Compress horizontally"
    {...props}
  >
    <FontAwesomeIcon key={1} icon={faArrowRight} />
    <FontAwesomeIcon key={2} icon={faArrowLeft} />
  </Button>);
}

function VerticalExpansionButton(props) {
  return (<Button
    style={{fontSize: 10, display: "flex", flexDirection: "column"}}
    title="Expand vertically"
    {...props}
  >
    <FontAwesomeIcon key={1} icon={faArrowUp} />
    <FontAwesomeIcon key={2} icon={faArrowDown} />
  </Button>);
}

function VerticalCompressionButton(props) {
  return (<Button
    style={{fontSize: 10, display: "flex", flexDirection: "column"}}
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
    {...props}
  >
    <FontAwesomeIcon key={1} icon={faAlignRight}/>
  </Button>);
}


function AlignTipsLeftButton(props) {
  return (<Button
    title="Align tips to left"
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
      width: 500,
      height: 500,
      alignTips: "right",
      sort: null,
      internal: false,
      clickedBranch: null
    };
  }
  componentDidMount() {
    text(newick)
      .then(newick => {
        this.setState({newick});
      });
  }
  toggleDimension(dimension, direction) {
    const new_dimension = this.state[dimension] +
      (direction === "expand" ? 20 : -20),
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
  render() {
    const { padding } = this.props;
    const { width, height, clickedBranch } = this.state;
    return (<div style={{display: "flex", flexDirection: "column", alignItems: "flex-start"}}>
      <h1>React Phylotree</h1>
      <div style={{display: "flex", justifyContent: "space-around"}}>
        <ButtonGroup>
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
          <AscendingSortButton
            onClick={()=>this.handleSort("ascending")}
          />
          <DescendingSortButton
            onClick={()=>this.handleSort("descending")}
          />
          <AlignTipsLeftButton
            onClick={()=>this.alignTips("left")}
          />
          <AlignTipsRightButton
            onClick={()=>this.alignTips("right")}
          />
        </ButtonGroup>
        <div>
          <input
            type='checkbox'
            onChange={()=>this.setState({internal: !this.state.internal})}
          />
          {this.state.internal ? 'Hide' : 'Show' } internal labels
        </div>
      </div>
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
      {clickedBranch ? <p>
        Last clicked branch was {clickedBranch}.
      </p> : null}
    </div>);
  }
}

PhylogeneticTreeTest.defaultProps = {
  padding: 10
};

export default PhylogeneticTreeTest;