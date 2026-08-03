module.exports = (req, res) => {
    const supabaseUrl = process.env.SUPABASE_URL || '';
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
    res.status(200).json({
        url: supabaseUrl,
        key: supabaseAnonKey
    });
};
