import { useState } from 'react';
import { documentation, categories } from '../config/documentationConfig.js';

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
        <div className="h-full overflow-y-auto" style={{ 
            backgroundColor: 'var(--color-primary)',
            fontFamily: 'Inter, "Noto Sans", sans-serif' 
        }}>
            <div className="container mx-auto px-6 py-8">
                {/* Introduction Section */}
                <div className="mb-12 rounded-lg p-8 border" style={{
                    background: 'linear-gradient(to right, var(--color-secondary), var(--color-tertiary))',
                    borderColor: 'var(--color-border)'
                }}>
                    <h1 className="text-3xl font-bold mb-4" style={{ color: 'var(--color-textPrimary)' }}>Protein Pipeline Documentation</h1>
                    <div className="space-y-4" style={{ color: 'var(--color-textSecondary)' }}>
                        <p>
                            This comprehensive protein analysis pipeline provides automated tools for bioinformatics research,
                            from sequence generation to structure prediction, similarity searching, and functional analysis.
                            Each block represents a specialized tool that can be connected in workflows to create sophisticated analysis pipelines.
                        </p>
                        <div className="grid md:grid-cols-3 gap-6 mt-6">
                            <div className="p-4 rounded" style={{ backgroundColor: 'var(--color-secondary)' }}>
                                <h3 className="font-semibold mb-2" style={{ color: 'var(--color-textPrimary)' }}>🧬 Structure Prediction</h3>
                                <p className="text-sm">ESMFold, OpenFold, and AlphaFold2 for accurate 3D structure prediction</p>
                            </div>
                            <div className="p-4 rounded" style={{ backgroundColor: 'var(--color-secondary)' }}>
                                <h3 className="font-semibold mb-2" style={{ color: 'var(--color-textPrimary)' }}>🔍 Similarity Search</h3>
                                <p className="text-sm">BLAST, ColabFold MSA, and FoldSeek for comprehensive homology analysis</p>
                            </div>
                            <div className="p-4 rounded" style={{ backgroundColor: 'var(--color-secondary)' }}>
                                <h3 className="font-semibold mb-2" style={{ color: 'var(--color-textPrimary)' }}>⚗️ Drug Discovery</h3>
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
                                className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2"
                                style={{
                                    backgroundColor: 'var(--color-secondary)',
                                    color: 'var(--color-textPrimary)',
                                    borderColor: 'var(--color-border)',
                                    '--tw-ring-color': 'var(--color-accent)'
                                }}
                            />
                        </div>
                        <div>
                            <select
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                className="px-4 py-2 rounded-lg border focus:outline-none focus:ring-2"
                                style={{
                                    backgroundColor: 'var(--color-secondary)',
                                    color: 'var(--color-textPrimary)',
                                    borderColor: 'var(--color-border)',
                                    '--tw-ring-color': 'var(--color-accent)'
                                }}
                            >
                                {categories.map(category => (
                                    <option key={category} value={category}>{category}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="text-sm" style={{ color: 'var(--color-textSecondary)' }}>
                        Showing {filteredDocs.length} of {documentation.length} blocks
                    </div>
                </div>

                {/* Documentation Cards */}
                <div className="space-y-6">
                    {filteredDocs.map(doc => (
                        <div key={doc.id} className="rounded-lg border overflow-hidden" style={{ backgroundColor: 'var(--color-secondary)', borderColor: 'var(--color-border)' }}>
                            {/* Card Header */}
                            <div
                                className="px-6 py-4 cursor-pointer transition-colors"
                                style={{ backgroundColor: 'transparent' }}
                                onMouseEnter={(e) => e.target.closest('div').style.backgroundColor = 'var(--color-tertiary)'}
                                onMouseLeave={(e) => e.target.closest('div').style.backgroundColor = 'transparent'}
                                onClick={() => toggleBlock(doc.id)}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getBlockColor(doc.category) }}></div>
                                        <div>
                                            <h3 className="text-lg font-semibold" style={{ color: 'var(--color-textPrimary)' }}>{doc.name}</h3>
                                            <p className="text-sm" style={{ color: 'var(--color-textSecondary)' }}>{doc.category}</p>
                                        </div>
                                    </div>
                                    <div style={{ color: 'var(--color-textSecondary)' }}>
                                        {expandedBlocks[doc.id] ? '−' : '+'}
                                    </div>
                                </div>
                                <p className="mt-2" style={{ color: 'var(--color-textSecondary)' }}>{doc.description}</p>
                            </div>

                            {/* Expanded Content */}
                            {expandedBlocks[doc.id] && (
                                <div className="px-6 pb-6 border-t" style={{ borderColor: 'var(--color-border)' }}>
                                    <div className="space-y-8 mt-6">

                                        {/* Frontend Usage Section */}
                                        {doc.frontendUsage && (
                                            <div className="rounded-lg p-6" style={{ backgroundColor: 'var(--color-tertiary)' }}>
                                                <h4 className="font-semibold mb-4 text-lg" style={{ color: 'var(--color-textPrimary)' }}>🖥️ Frontend Usage</h4>

                                                <div className="grid md:grid-cols-2 gap-6">
                                                    {/* User Interface */}
                                                    <div>
                                                        <h5 className="font-semibold mb-3" style={{ color: 'var(--color-accent)' }}>User Interface</h5>
                                                        <p className="text-sm mb-4" style={{ color: 'var(--color-textSecondary)' }}>{doc.frontendUsage.userInterface}</p>

                                                        {/* User Inputs */}
                                                        <h6 className="font-medium mb-2" style={{ color: 'var(--color-textPrimary)' }}>Required Inputs:</h6>
                                                        <div className="space-y-2">
                                                            {doc.frontendUsage.userInputs.map((input, index) => (
                                                                <div key={index} className="p-3 rounded text-sm" style={{ backgroundColor: 'var(--color-secondary)' }}>
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                        <span className="font-medium" style={{ color: 'var(--color-accent)' }}>{input.name}</span>
                                                                        {input.required && <span className="text-xs" style={{ color: 'var(--color-error)' }}>*required</span>}
                                                                    </div>
                                                                    <p className="text-xs" style={{ color: 'var(--color-textSecondary)' }}>{input.description}</p>
                                                                    <div className="text-xs mt-1" style={{ color: 'var(--color-textSecondary)' }}>
                                                                        <span style={{ color: 'var(--color-warning)' }}>Type: </span>{input.type}
                                                                    </div>
                                                                    {input.options && (
                                                                        <div className="text-xs mt-1" style={{ color: 'var(--color-textSecondary)' }}>
                                                                            <span style={{ color: 'var(--color-warning)' }}>Options: </span>{input.options.join(', ')}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {/* Configuration Parameters */}
                                                    <div>
                                                        <h5 className="font-semibold mb-3" style={{ color: 'var(--color-accent)' }}>Configuration Parameters</h5>
                                                        {typeof doc.frontendUsage.configParams === 'string' ? (
                                                            <p className="text-sm italic" style={{ color: 'var(--color-textSecondary)' }}>{doc.frontendUsage.configParams}</p>
                                                        ) : (
                                                            <div className="space-y-3 max-h-96 overflow-y-auto">
                                                                {Object.entries(doc.frontendUsage.configParams || {}).map(([param, config]) => (
                                                                    <div key={param} className="p-3 rounded text-sm" style={{ backgroundColor: 'var(--color-secondary)' }}>
                                                                        <div className="flex items-center justify-between mb-2">
                                                                            <span className="font-medium" style={{ color: 'var(--color-accent)' }}>{param}</span>
                                                                            <span className="text-xs px-2 py-1 rounded" style={{ color: 'var(--color-textSecondary)', backgroundColor: 'var(--color-tertiary)' }}>
                                                                                {config.type}
                                                                            </span>
                                                                        </div>
                                                                        <p className="text-xs mb-2" style={{ color: 'var(--color-textSecondary)' }}>{config.description}</p>
                                                                        <div className="text-xs space-y-1">
                                                                            <div><span style={{ color: 'var(--color-warning)' }}>Significance: </span><span style={{ color: 'var(--color-textSecondary)' }}>{config.significance}</span></div>
                                                                            {config.defaultValue !== undefined && (
                                                                                <div><span style={{ color: 'var(--color-warning)' }}>Default: </span><span style={{ color: 'var(--color-textSecondary)' }}>{JSON.stringify(config.defaultValue)}</span></div>
                                                                            )}
                                                                            {config.range && (
                                                                                <div><span style={{ color: 'var(--color-warning)' }}>Range: </span><span style={{ color: 'var(--color-textSecondary)' }}>{config.range}</span></div>
                                                                            )}
                                                                            {config.options && (
                                                                                <div><span style={{ color: 'var(--color-warning)' }}>Options: </span><span style={{ color: 'var(--color-textSecondary)' }}>{config.options.join(', ')}</span></div>
                                                                            )}
                                                                            {config.userGuidance && (
                                                                                <div className="mt-2 p-2 rounded" style={{ backgroundColor: 'var(--color-tertiary)' }}>
                                                                                    <span className="text-xs" style={{ color: 'var(--color-success)' }}>💡 Tip: </span>
                                                                                    <span className="text-xs" style={{ color: 'var(--color-textSecondary)' }}>{config.userGuidance}</span>
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
                                                        <h5 className="font-semibold mb-3" style={{ color: 'var(--color-accent)' }}>📸 Screenshots</h5>
                                                        <div className="grid md:grid-cols-2 gap-4">
                                                            {Object.entries(doc.frontendUsage.screenshots).map(([type, description]) => {
                                                                const isImageUrl = description.startsWith('http');
                                                                return (
                                                                    <div key={type} className="p-4 rounded text-center" style={{ backgroundColor: 'var(--color-secondary)' }}>
                                                                        <div className="w-full h-48 rounded mb-2 flex items-center justify-center border-2 border-dashed overflow-hidden" style={{ backgroundColor: 'var(--color-tertiary)', borderColor: 'var(--color-border)' }}>
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
                                                                                className={`text-xs ${isImageUrl ? 'hidden' : 'block'}`}
                                                                                style={{ 
                                                                                    display: isImageUrl ? 'none' : 'flex', 
                                                                                    alignItems: 'center', 
                                                                                    justifyContent: 'center', 
                                                                                    width: '100%', 
                                                                                    height: '100%',
                                                                                    color: 'var(--color-textSecondary)'
                                                                                }}
                                                                            >
                                                                                {isImageUrl ? '📷 Image failed to load' : '📷 Image placeholder'}
                                                                            </span>
                                                                        </div>
                                                                        <h6 className="text-sm font-medium mb-1 capitalize" style={{ color: 'var(--color-textPrimary)' }}>
                                                                            {type.replace(/([A-Z])/g, ' $1').trim()}
                                                                        </h6>
                                                                        <p className="text-xs" style={{ color: 'var(--color-textSecondary)' }}>
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
                                                    <h4 className="font-semibold mb-3" style={{ color: 'var(--color-textPrimary)' }}>🛠️ Tools & Technologies</h4>
                                                    <ul className="space-y-1 text-sm" style={{ color: 'var(--color-textSecondary)' }}>
                                                        {doc.toolsUsed.map((tool, index) => (
                                                            <li key={index} className="flex items-start gap-2">
                                                                <span className="mt-1" style={{ color: 'var(--color-accent)' }}>•</span>
                                                                <span>{tool}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>

                                                {/* Input Format */}
                                                <div>
                                                    <h4 className="font-semibold mb-3" style={{ color: 'var(--color-textPrimary)' }}>📥 Input Format</h4>
                                                    <p className="text-sm mb-2" style={{ color: 'var(--color-textSecondary)' }}>{doc.inputFormat.description}</p>
                                                    <ul className="space-y-1 text-sm" style={{ color: 'var(--color-textSecondary)' }}>
                                                        {doc.inputFormat.formats.map((format, index) => (
                                                            <li key={index} className="flex items-start gap-2">
                                                                <span className="mt-1" style={{ color: 'var(--color-accent)' }}>•</span>
                                                                <span dangerouslySetInnerHTML={{ __html: format }} />
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>

                                                {/* Example Usage */}
                                                <div>
                                                    <h4 className="font-semibold mb-3" style={{ color: 'var(--color-textPrimary)' }}>💡 Example Usage</h4>
                                                    <p className="text-sm p-3 rounded" style={{ color: 'var(--color-textSecondary)', backgroundColor: 'var(--color-tertiary)' }}>
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
                    <div className="text-center py-12" style={{ color: 'var(--color-textSecondary)' }}>
                        <p>No blocks found matching your search criteria.</p>
                    </div>
                )}

                {/* Footer Information */}
                <div className="mt-16 rounded-lg p-8 border" style={{ backgroundColor: 'var(--color-secondary)', borderColor: 'var(--color-border)' }}>
                    <div className="grid md:grid-cols-2 gap-8">
                        <div>
                            <h3 className="font-semibold mb-4" style={{ color: 'var(--color-textPrimary)' }}>🔗 Pipeline Integration</h3>
                            <div className="text-sm space-y-2" style={{ color: 'var(--color-textSecondary)' }}>
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
                    <div className="mt-8 pt-6 border-t text-center" style={{ borderColor: 'var(--color-border)' }}>
                        <p className="text-sm" style={{ color: 'var(--color-textSecondary)' }}>
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