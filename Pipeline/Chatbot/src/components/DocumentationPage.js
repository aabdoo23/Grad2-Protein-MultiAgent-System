import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { documentation, categories } from '../config/documentation.js';

const DocumentationPage = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [expandedBlocks, setExpandedBlocks] = useState({});

    const toggleBlock = (blockId) => {
        setExpandedBlocks(prev => ({
            ...prev,
            [blockId]: !prev[blockId]
        }));
    };

    const filteredDocs = documentation.filter(doc => {
        const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            doc.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            doc.toolsUsed.some(tool => tool.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesCategory = selectedCategory === 'All' || doc.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    return (
        <div className="min-h-screen bg-[#111c22]" style={{ fontFamily: 'Inter, "Noto Sans", sans-serif' }}>
            {/* Header */}
            <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-b-[#233c48] px-10 py-3">
                <div className="flex items-center gap-4 text-white">
                    <div className="size-4">
                        <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path
                                d="M42.4379 44C42.4379 44 36.0744 33.9038 41.1692 24C46.8624 12.9336 42.2078 4 42.2078 4L7.01134 4C7.01134 4 11.6577 12.932 5.96912 23.9969C0.876273 33.9029 7.27094 44 7.27094 44L42.4379 44Z"
                                fill="currentColor"
                            />
                        </svg>
                    </div>
                    <h2 className="text-white text-lg font-bold leading-tight tracking-[-0.015em]">Protein Pipeline Documentation</h2>
                </div>
                <div className="flex gap-4">
                    <Link to="/sandbox" className="bg-[#13a4ec] hover:bg-[#0f8fd1] text-white px-4 py-2 rounded text-sm">
                        Pipeline Sandbox
                    </Link>
                    <Link to="/" className="bg-[#233c48] hover:bg-[#2a4653] text-white px-4 py-2 rounded text-sm">
                        Back to Chat
                    </Link>
                </div>
            </header>

            <div className="container mx-auto px-6 py-8">
                {/* Introduction Section */}
                <div className="mb-12 bg-gradient-to-r from-[#1a2932] to-[#233c48] rounded-lg p-8 border border-[#3a5663]">
                    <h1 className="text-3xl font-bold text-white mb-4">Protein Pipeline Documentation</h1>
                    <div className="text-[#92b7c9] space-y-4">
                        <p>
                            This comprehensive protein analysis pipeline provides automated tools for bioinformatics research,
                            from sequence generation to structure prediction, similarity searching, and functional analysis.
                            Each block represents a specialized tool that can be connected in workflows to create sophisticated analysis pipelines.
                        </p>
                        <div className="grid md:grid-cols-3 gap-6 mt-6">
                            <div className="bg-[#233c48] p-4 rounded">
                                <h3 className="text-white font-semibold mb-2">🧬 Structure Prediction</h3>
                                <p className="text-sm">ESMFold, OpenFold, and AlphaFold2 for accurate 3D structure prediction</p>
                            </div>
                            <div className="bg-[#233c48] p-4 rounded">
                                <h3 className="text-white font-semibold mb-2">🔍 Similarity Search</h3>
                                <p className="text-sm">BLAST, ColabFold MSA, and FoldSeek for comprehensive homology analysis</p>
                            </div>
                            <div className="bg-[#233c48] p-4 rounded">
                                <h3 className="text-white font-semibold mb-2">⚗️ Drug Discovery</h3>
                                <p className="text-sm">Binding site prediction and molecular docking for pharmaceutical research</p>
                            </div>
                        </div>
                    </div>
                </div>
                {/* Search and Filter Controls */}
                <div className="mb-8 space-y-4">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1">
                            <input
                                type="text"
                                placeholder="Search blocks, tools, or descriptions..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full px-4 py-2 bg-[#233c48] text-white rounded-lg border border-[#3a5663] focus:border-[#13a4ec] focus:outline-none"
                            />
                        </div>
                        <div>
                            <select
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                className="px-4 py-2 bg-[#233c48] text-white rounded-lg border border-[#3a5663] focus:border-[#13a4ec] focus:outline-none"
                            >
                                {categories.map(category => (
                                    <option key={category} value={category}>{category}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="text-[#92b7c9] text-sm">
                        Showing {filteredDocs.length} of {documentation.length} blocks
                    </div>
                </div>

                {/* Documentation Cards */}
                <div className="space-y-6">
                    {filteredDocs.map(doc => (
                        <div key={doc.id} className="bg-[#1a2932] rounded-lg border border-[#233c48] overflow-hidden">
                            {/* Card Header */}
                            <div
                                className="px-6 py-4 cursor-pointer hover:bg-[#233c48] transition-colors"
                                onClick={() => toggleBlock(doc.id)}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getBlockColor(doc.category) }}></div>
                                        <div>
                                            <h3 className="text-white text-lg font-semibold">{doc.name}</h3>
                                            <p className="text-[#92b7c9] text-sm">{doc.category}</p>
                                        </div>
                                    </div>
                                    <div className="text-[#92b7c9]">
                                        {expandedBlocks[doc.id] ? '−' : '+'}
                                    </div>
                                </div>
                                <p className="text-[#92b7c9] mt-2">{doc.description}</p>
                            </div>

                            {/* Expanded Content */}
                            {expandedBlocks[doc.id] && (
                                <div className="px-6 pb-6 border-t border-[#233c48]">
                                    <div className="space-y-8 mt-6">

                                        {/* Frontend Usage Section */}
                                        {doc.frontendUsage && (
                                            <div className="bg-[#233c48] rounded-lg p-6">
                                                <h4 className="text-white font-semibold mb-4 text-lg">🖥️ Frontend Usage</h4>

                                                <div className="grid md:grid-cols-2 gap-6">
                                                    {/* User Interface */}
                                                    <div>
                                                        <h5 className="text-[#13a4ec] font-semibold mb-3">User Interface</h5>
                                                        <p className="text-[#92b7c9] text-sm mb-4">{doc.frontendUsage.userInterface}</p>

                                                        {/* User Inputs */}
                                                        <h6 className="text-white font-medium mb-2">Required Inputs:</h6>
                                                        <div className="space-y-2">
                                                            {doc.frontendUsage.userInputs.map((input, index) => (
                                                                <div key={index} className="bg-[#1a2932] p-3 rounded text-sm">
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                        <span className="text-[#13a4ec] font-medium">{input.name}</span>
                                                                        {input.required && <span className="text-red-400 text-xs">*required</span>}
                                                                    </div>
                                                                    <p className="text-[#92b7c9] text-xs">{input.description}</p>
                                                                    <div className="text-[#92b7c9] text-xs mt-1">
                                                                        <span className="text-yellow-300">Type: </span>{input.type}
                                                                    </div>
                                                                    {input.options && (
                                                                        <div className="text-[#92b7c9] text-xs mt-1">
                                                                            <span className="text-yellow-300">Options: </span>{input.options.join(', ')}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {/* Configuration Parameters */}
                                                    <div>
                                                        <h5 className="text-[#13a4ec] font-semibold mb-3">Configuration Parameters</h5>
                                                        {typeof doc.frontendUsage.configParams === 'string' ? (
                                                            <p className="text-[#92b7c9] text-sm italic">{doc.frontendUsage.configParams}</p>
                                                        ) : (
                                                            <div className="space-y-3 max-h-96 overflow-y-auto">
                                                                {Object.entries(doc.frontendUsage.configParams || {}).map(([param, config]) => (
                                                                    <div key={param} className="bg-[#1a2932] p-3 rounded text-sm">
                                                                        <div className="flex items-center justify-between mb-2">
                                                                            <span className="text-[#13a4ec] font-medium">{param}</span>
                                                                            <span className="text-xs text-[#92b7c9] bg-[#233c48] px-2 py-1 rounded">
                                                                                {config.type}
                                                                            </span>
                                                                        </div>
                                                                        <p className="text-[#92b7c9] text-xs mb-2">{config.description}</p>
                                                                        <div className="text-xs space-y-1">
                                                                            <div><span className="text-yellow-300">Significance: </span><span className="text-[#92b7c9]">{config.significance}</span></div>
                                                                            {config.defaultValue !== undefined && (
                                                                                <div><span className="text-yellow-300">Default: </span><span className="text-[#92b7c9]">{JSON.stringify(config.defaultValue)}</span></div>
                                                                            )}
                                                                            {config.range && (
                                                                                <div><span className="text-yellow-300">Range: </span><span className="text-[#92b7c9]">{config.range}</span></div>
                                                                            )}
                                                                            {config.options && (
                                                                                <div><span className="text-yellow-300">Options: </span><span className="text-[#92b7c9]">{config.options.join(', ')}</span></div>
                                                                            )}
                                                                            {config.userGuidance && (
                                                                                <div className="mt-2 p-2 bg-[#233c48] rounded">
                                                                                    <span className="text-green-300 text-xs">💡 Tip: </span>
                                                                                    <span className="text-[#92b7c9] text-xs">{config.userGuidance}</span>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>                                               
                                                {/* Screenshots Section */}
                                                {doc.frontendUsage.screenshots && (
                                                    <div className="mt-6">
                                                        <h5 className="text-[#13a4ec] font-semibold mb-3">📸 Screenshots</h5>
                                                        <div className="grid md:grid-cols-2 gap-4">
                                                            {Object.entries(doc.frontendUsage.screenshots).map(([type, description]) => {
                                                                const isImageUrl = description.startsWith('http');
                                                                return (
                                                                    <div key={type} className="bg-[#1a2932] p-4 rounded text-center">
                                                                        <div className="w-full h-48 bg-[#233c48] rounded mb-2 flex items-center justify-center border-2 border-dashed border-[#3a5663] overflow-hidden">
                                                                            {isImageUrl ? (
                                                                                <img
                                                                                    src={description}
                                                                                    alt={`${type} screenshot`}
                                                                                    className="w-full h-full object-contain rounded cursor-pointer hover:object-cover transition-all duration-300"
                                                                                    onError={(e) => {
                                                                                        e.target.style.display = 'none';
                                                                                        e.target.nextSibling.style.display = 'flex';
                                                                                    }}
                                                                                    onClick={() => {
                                                                                        window.open(description, '_blank');
                                                                                    }}
                                                                                />
                                                                            ) : null}
                                                                            <span
                                                                                className={`text-[#92b7c9] text-xs ${isImageUrl ? 'hidden' : 'block'}`}
                                                                                style={{ display: isImageUrl ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}
                                                                            >
                                                                                {isImageUrl ? '📷 Image failed to load' : '📷 Image placeholder'}
                                                                            </span>
                                                                        </div>
                                                                        <h6 className="text-white text-sm font-medium mb-1 capitalize">
                                                                            {type.replace(/([A-Z])/g, ' $1').trim()}
                                                                        </h6>
                                                                        <p className="text-[#92b7c9] text-xs">
                                                                            {isImageUrl ? `${type.replace(/([A-Z])/g, ' $1').trim()}` : description}
                                                                        </p>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        <div className="grid md:grid-cols-2 gap-6">
                                            {/* Left Column */}
                                            <div className="space-y-6">
                                                {/* Tools Used */}
                                                <div>
                                                    <h4 className="text-white font-semibold mb-3">🛠️ Tools & Technologies</h4>
                                                    <ul className="space-y-1 text-[#92b7c9] text-sm">
                                                        {doc.toolsUsed.map((tool, index) => (
                                                            <li key={index} className="flex items-start gap-2">
                                                                <span className="text-[#13a4ec] mt-1">•</span>
                                                                <span>{tool}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>

                                                {/* Input Format */}
                                                <div>
                                                    <h4 className="text-white font-semibold mb-3">📥 Input Format</h4>
                                                    <p className="text-[#92b7c9] text-sm mb-2">{doc.inputFormat.description}</p>
                                                    <ul className="space-y-1 text-[#92b7c9] text-sm">
                                                        {doc.inputFormat.formats.map((format, index) => (
                                                            <li key={index} className="flex items-start gap-2">
                                                                <span className="text-[#13a4ec] mt-1">•</span>
                                                                <span dangerouslySetInnerHTML={{ __html: format }} />
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>

                                                {/* Example Usage */}
                                                <div>
                                                    <h4 className="text-white font-semibold mb-3">💡 Example Usage</h4>
                                                    <p className="text-[#92b7c9] text-sm bg-[#233c48] p-3 rounded">
                                                        {doc.exampleUsage}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Right Column */}
                                            <div className="space-y-6">
                                                {/* Output Format */}
                                                <div>
                                                    <h4 className="text-white font-semibold mb-3">📤 Output Format</h4>
                                                    <p className="text-[#92b7c9] text-sm mb-3">{doc.outputFormat.description}</p>

                                                    {/* Output Structure */}
                                                    <div className="bg-[#233c48] p-3 rounded text-sm">
                                                        <div className="text-[#92b7c9] mb-2">Structure:</div>
                                                        <pre className="text-[#13a4ec] text-xs overflow-x-auto">
                                                            {JSON.stringify(doc.outputFormat.structure, null, 2)}
                                                        </pre>
                                                    </div>

                                                    {/* Example Output */}
                                                    {doc.outputFormat.example && (
                                                        <div className="mt-3">
                                                            <div className="text-[#92b7c9] text-sm mb-2">Example:</div>
                                                            <div className="bg-[#2a4653] p-3 rounded text-sm">
                                                                <pre className="text-[#92b7c9] text-xs overflow-x-auto">
                                                                    {JSON.stringify(doc.outputFormat.example, null, 2)}
                                                                </pre>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Limitations */}
                                                {doc.limitations.length > 0 && (
                                                    <div>
                                                        <h4 className="text-white font-semibold mb-3">⚠️ Limitations</h4>
                                                        <ul className="space-y-1 text-[#92b7c9] text-sm">
                                                            {doc.limitations.map((limitation, index) => (
                                                                <li key={index} className="flex items-start gap-2">
                                                                    <span className="text-yellow-500 mt-1">•</span>
                                                                    <span>{limitation}</span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}

                                                {/* Citations */}
                                                {doc.citations.length > 0 && (
                                                    <div>
                                                        <h4 className="text-white font-semibold mb-3">📚 Citations</h4>
                                                        <ul className="space-y-2 text-[#92b7c9] text-sm">
                                                            {doc.citations.map((citation, index) => (
                                                                <li key={index} className="text-xs bg-[#233c48] p-2 rounded">
                                                                    {citation}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {filteredDocs.length === 0 && (
                    <div className="text-center text-[#92b7c9] py-12">
                        <p>No blocks found matching your search criteria.</p>
                    </div>
                )}

                {/* Footer Information */}
                <div className="mt-16 bg-[#1a2932] rounded-lg p-8 border border-[#233c48]">
                    <div className="grid md:grid-cols-2 gap-8">
                        <div>
                            <h3 className="text-white font-semibold mb-4">🔗 Pipeline Integration</h3>
                            <div className="text-[#92b7c9] text-sm space-y-2">
                                <p>Blocks can be connected in the Pipeline Sandbox to create automated workflows:</p>
                                <ul className="list-disc list-inside space-y-1 ml-4">
                                    <li><strong>File Upload</strong> → <strong>Structure Prediction</strong> → <strong>Binding Site Prediction</strong> → <strong>Molecular Docking</strong></li>
                                    <li><strong>Generate Protein</strong> → <strong>Sequence Search</strong> → <strong>Phylogenetic Tree</strong></li>
                                    <li><strong>Structure Prediction</strong> → <strong>Structure Analysis</strong> → <strong>Quality Assessment</strong></li>
                                </ul>
                            </div>
                        </div>
                        <div>
                            <h3 className="text-white font-semibold mb-4">⚙️ System Requirements</h3>
                            <div className="text-[#92b7c9] text-sm space-y-2">
                                <p>Some tools require local installations or API access:</p>
                                <ul className="list-disc list-inside space-y-1 ml-4">
                                    <li><strong>API Keys</strong>: NVIDIA Cloud Functions for structure prediction and MSA search</li>
                                    <li><strong>Local Tools</strong>: BLAST+, P2Rank, AutoDock Vina, USalign</li>
                                    <li><strong>Dependencies</strong>: Python libraries (BioPython, RDKit, Matplotlib)</li>
                                    <li><strong>Resources</strong>: Sufficient disk space for databases and temporary files</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    <div className="mt-8 pt-6 border-t border-[#233c48] text-center">
                        <p className="text-[#92b7c9] text-sm">
                            For technical support, API access, or custom pipeline development, please refer to the project documentation or contact the development team.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Helper function to get block color based on category
const getBlockColor = (category) => {
    const colorMap = {
        'I/O': '#653239',
        'Generate Protein': '#005f73',
        'Iterate': '#073b4c',
        '3D Structure Prediction': '#D8973C',
        'Multiple Sequence Alignment': '#264653',
        'BLAST Search': '#0E3938',
        '3D Structure Search': '#28666E',
        'Docking': '#033F63',
        'Phylogenetic Analysis': '#2D5A27',
        'Structure Analysis': '#8B4513'
    };
    return colorMap[category] || '#666666';
};

export default DocumentationPage;