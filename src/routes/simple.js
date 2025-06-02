const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
	res.json({ message: 'Simple route working' });
});

module.exports = router;
