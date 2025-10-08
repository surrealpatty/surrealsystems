// ---------------- Login ----------------
router.post('/login', async (req, res) => {
  try {
    const { email, username, password } = req.body;
    if ((!email && !username) || !password)
      return res.status(400).json({ error: 'Email or username and password required' });

    const user = await User.findOne({
      where: email ? { email } : { username },
    });

    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        description: user.description,
        tier: user.tier
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});
