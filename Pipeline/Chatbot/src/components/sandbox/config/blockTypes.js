export const blockTypes = [
    {
      id: 'multi_download',
      name: 'Multi Download',
      description: 'Download output from multiple blocks once they are completed',
      color: '#9b2226',
      inputs: ['input'],
      outputs: []
    },
    {
      id: 'generate_protein',
      name: 'Generate Protein',
      description: 'Generate a protein sequence with specific properties',
      color: '#005f73',
      inputs: ['*'],
      outputs: ['sequence']
    },
    {
      id: 'sequence_iterator',
      name: 'Sequence Iterator',
      description: 'Iterate through a list of sequences one at a time',
      color: '#073b4c',
      inputs: ['*'],
      outputs: ['sequence']
    },
    {
      id: 'predict_structure',
      name: 'Predict Structure',
      description: 'Predict the 3D structure of a protein sequence',
      color: '#f4a261',
      inputs: ['sequence'],
      outputs: ['structure']
    },
    {
      id: 'search_similarity',
      name: 'Search Similarity',
      description: 'Search for similar protein sequences',
      color: '#264653',
      inputs: ['sequence'],
      outputs: ['results']
    },
    {
      id: 'search_structure',
      name: 'Search Structure',
      description: 'Search for similar protein structures using FoldSeek',
      color: '#2a9d8f',
      inputs: ['structure'],
      outputs: ['results']
    }
  ];
