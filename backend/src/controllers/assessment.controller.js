const placeholder = async (req, res) => {
  res.status(200).json({ message: "Assessment health check OK" });
};

module.exports = {
  placeholder,
};
