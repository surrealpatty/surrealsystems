exports.getAllServices = async (req, res) => {
  res.json([]); // return empty for now
};

exports.createService = async (req, res) => {
  res.json({ message: 'Service created (placeholder)' });
};
