import React, { useState, useEffect } from "react";
import { phylotree } from "phylotree";
import { scaleLinear, scaleOrdinal } from "d3-scale";
import { schemeCategory10 } from "d3-scale-chromatic";
import _ from "underscore";
import { AxisTop } from "d3-react-axis";
import { max } from "d3-array";

import Branch from "./branch.jsx";
import text_width from "./text_width";


function x_branch_lengths(node, accessor) {
  if (!node.parent) return 0;
  const bl = accessor(node);
  return  bl + node.parent.data.abstract_x;
}

function x_no_branch_lengths(node) {
  return node.parent ? node.parent.data.abstract_x + 1 : 0;
}

function default_accessor(node){
  return +node.data.attribute;
}

function sort_nodes (tree, direction) {
  tree.traverse_and_compute (function (n) {
    var d = 1;
    if (n.children && n.children.length) {
      d += max (n.children, function (d) { return d["count_depth"];});
    }
    n["count_depth"] = d;
  });
  const asc = direction === "ascending";
  tree.resortChildren (function (a,b) {
    return (a["count_depth"] - b["count_depth"]) * (asc ? 1 : -1);
  });
}

function placenodes(tree, perform_internal_layout, accessor, sort) {
  accessor = accessor || default_accessor;
  if(sort) {
    sort_nodes(tree, sort);
  }
  var current_leaf_height = -1,
    unique_id = 0;
  tree.max_x = 0;
  const has_branch_lengths = Boolean(accessor(tree.getTips()[0])),
    x_branch_length = has_branch_lengths ? x_branch_lengths : x_no_branch_lengths;
  function node_layout(node) {
    if(!node.unique_id) {
      unique_id = node.unique_id = unique_id + 1;
    }
    node.data.abstract_x = x_branch_length(node, accessor);
    tree.max_x = Math.max(tree.max_x, node.data.abstract_x);
    if(node.children) {
      node.data.abstract_y = node.children.map(node_layout)
        .reduce( (a,b) => a + b, 0) / node.children.length;
    } else {
      current_leaf_height = node.data.abstract_y = current_leaf_height+1;
    }
    return node.data.abstract_y;
  }

  function internal_node_layout(node) {
    unique_id = node.unique_id = unique_id + 1;
    node.data.abstract_x = x_branch_length(node, accessor);
    tree.max_x = Math.max(tree.max_x, node.data.abstract_x);
    if(!tree.isLeafNode(node)) {
      node.children.forEach(internal_node_layout);
    }
    if(!node.data.abstract_y && node.data.name !== "root") {
      current_leaf_height = node.data.abstract_y = current_leaf_height+1;
      tree.node_order.push(node.data.name);
    }
    if(node.parent && !node.parent.data.abstract_y && node.data.name !== "root") {
      if(node.parent.data.name !== "root") {
        current_leaf_height = node.parent.data.abstract_y = current_leaf_height+1;
        tree.node_order.push(node.parent.data.name);
      } 
    }
    tree.max_y = Math.max(tree.max_y, current_leaf_height);
  }

  if(perform_internal_layout) {
    tree.max_y = 0;
    tree.node_order = [];
    internal_node_layout(tree.nodes);
    const root = tree.getNodeByName("root");
    root.data.abstract_y = root.children.map(child => child.data.abstract_y)
      .reduce((a,b)=>a+b, 0) / root.children.length;
  } else {
    node_layout(tree.nodes);
    tree.max_y = current_leaf_height;
  }
}


function getColorScale(tree, highlightBranches) {
  if(!highlightBranches) return null;
  if(typeof highlightBranches === "boolean") {
    return tree.parsed_tags && highlightBranches ? 
      scaleOrdinal().domain(tree.parsed_tags).range(schemeCategory10) :
      null;
  }
  const pairs = _.pairs(highlightBranches);
  return scaleOrdinal()
    .domain(pairs.map(p => p[0]))
    .range(pairs.map(p => p[1]));
}


function Phylotree(props) {
  const [tooltip, setTooltip] = useState(false);
  const [highlightedLinks, setHighlightedLinks] = useState([]);
  const [distanceToRoot, setDistanceToRoot] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const { width, height, maxLabelWidth } = props;
  
  // Reset highlighted path when tree changes (e.g., sort, expand/collapse)
  useEffect(() => {
    setHighlightedLinks([]);
    setDistanceToRoot(null);
    setSelectedNode(null);
  }, [props.sort, props.alignTips]);
  
  var{ tree, newick } = props;
  if (!tree && !newick) {
    return <g />;
  } else if(!tree) {
    tree = new phylotree(newick);
  }
  if(!props.skipPlacement) {
    placenodes(tree, props.internalNodeLabels, props.accessor, props.sort);
  }

  function attachTextWidth(node) {
    node.data.text_width = text_width(node.data.name, 12, maxLabelWidth);
    if(node.children) node.children.forEach(attachTextWidth);
  }
  attachTextWidth(tree.nodes);
  
  const sorted_tips = tree.getTips().sort((a,b) => (
      b.data.abstract_x - a.data.abstract_x
    ));
  var rightmost;
  if (!props.showLabels) rightmost = width;
  else {
    for(let i=0; i < sorted_tips.length; i++) {
      let tip = sorted_tips[i];
      rightmost = width - tip.data.text_width;
      let scale = rightmost / tip.data.abstract_x;
      let none_cross = sorted_tips.map(tip => {
        const tip_x = tip.data.abstract_x * scale,
          text_x = width - tip.data.text_width,
          this_doesnt_cross = Math.floor(tip_x) < Math.ceil(text_x);
        return this_doesnt_cross;
      }).every(x => x);
      if(none_cross) break;
    }
  }
  const x_scale = scaleLinear()
      .domain([0, tree.max_x])
      .range([0, rightmost]),
    y_scale = scaleLinear()
      .domain([0, tree.max_y])
      .range([props.includeBLAxis ? 60 : 0, height]),
    color_scale = getColorScale(tree, props.highlightBranches);

  function handleLabelClick(targetNode) {
    // Animation state
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 500);
    
    // If already selected, deselect
    if (selectedNode && selectedNode.unique_id === targetNode.unique_id) {
      setHighlightedLinks([]);
      setDistanceToRoot(null);
      setSelectedNode(null);
      return;
    }
    
    // Store selected node
    setSelectedNode(targetNode);
    
    // Trace path to root and sum branch lengths
    let node = targetNode;
    let pathLinks = [];
    let totalDist = 0;
    let path = [targetNode.data.name];
    
    while (node.parent) {
      // Find the link (source, target) for this branch
      pathLinks.push(node.parent.unique_id + "," + node.unique_id);
      
      // Branch length is in node.data.attribute
      const branchLength = parseFloat(node.data.attribute || 0);
      totalDist += branchLength;
      
      // Add node name to path (if it exists)
      if (node.parent.data.name) {
        path.unshift(node.parent.data.name);
      }
      
      node = node.parent;
    }
    
    setHighlightedLinks(pathLinks);
    setDistanceToRoot(parseFloat(totalDist.toFixed(4)));
  }

  return (<g transform={props.transform} className={isAnimating ? 'animating' : ''}>
    {distanceToRoot !== null && (
      <g>
        <rect 
          x={width/2 - 120} 
          y={0} 
          width={240} 
          height={25} 
          rx={5} 
          fill="#f8f9fa" 
          stroke="#e74c3c"
          strokeWidth={1.5} 
        />
        <text 
          x={width/2} 
          y={18} 
          textAnchor="middle" 
          className="distance-label"
        >
          Distance to root: {distanceToRoot}
        </text>
        {selectedNode && (
          <text
            x={width/2}
            y={-40}
            textAnchor="middle"
            className="distance-label"
            style={{ fontSize: 12, fill: '#7f8c8d' }}
          >
            Selected: {selectedNode.data.name}
          </text>
        )}
      </g>
    )}
    {props.includeBLAxis ? <g>
      <AxisTop
        transform={`translate(0, 45)`}
        scale={x_scale}
      />
    </g> : null }
    {tree.links.map(link => {
      const source_id = link.source.unique_id,
        target_id = link.target.unique_id,
        key = source_id + "," + target_id,
        show_label = props.internalNodeLabels ||
          (props.showLabels && tree.isLeafNode(link.target));
      return (<Branch
        key={key}
        xScale={x_scale}
        yScale={y_scale}
        colorScale={color_scale}
        link={link}
        showLabel={show_label}
        maxLabelWidth={maxLabelWidth}
        width={width}
        alignTips={props.alignTips}
        branchStyler={props.branchStyler}
        labelStyler={props.labelStyler}
        tooltip={props.tooltip}
        setTooltip={setTooltip}
        onClick={props.onBranchClick}
        onLabelClick={handleLabelClick}
        highlighted={highlightedLinks.includes(key)}
      />);
    }) }
    { tooltip ? <props.tooltip
      width={props.width}
      height={props.height}
      {...tooltip}
    /> : null }
  </g>);
}

Phylotree.defaultProps = {
  width: 500,
  height: 500,
  showLabels: true,
  skipPlacement: false,
  maxLabelWidth: 20,
  alignTips: "right",
  accessor: default_accessor,
  branchStyler: null,
  labelStyler: null,
  tooltip: null,
  sort: null,
  includeBLAxis: false,
  onBranchClick: () => null
};

export default Phylotree;
export {
  placenodes
};