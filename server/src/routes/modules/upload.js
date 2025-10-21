const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

// POST /api/upload - File upload handler
exports.upload = upload.array('files', 10);

exports.uploadHandler = (req, res) => {
  const files = req.files || [];
  const mapped = files.map(f => ({ 
    originalname: f.originalname, 
    path: f.path, 
    size: f.size 
  }));
  res.json({ success: true, files: mapped });
};
