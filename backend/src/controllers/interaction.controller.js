const placeholder = async (req, res) => {
 res.status(200).json({ message: "Interaction & Admin health check OK" });
};

module.exports = {
 placeholder,
};