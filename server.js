// REQUIRED: You need to install these packages first by running:
// npm init -y
// npm install express cors pg

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const port = 3000;

// Enable CORS so your frontend can communicate with this backend
app.use(cors());
app.use(express.json());

// Configure your PostgreSQL connection based on your screenshot
// Update 'YOUR_PASSWORD' with your actual Postgres password
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'student_progression_project',
    password: 'Cloud@2022', // REPLACE THIS
    port: 5432,
});

// GET route to fetch all students from the database
app.get('/api/students', async (req, res) => {
    console.log("➡️ GET /api/students requested by frontend");
    try {
        const result = await pool.query('SELECT * FROM public.students ORDER BY student_id ASC');
        console.log(`✅ Successfully fetched ${result.rows.length} students from DB`);
        res.json(result.rows);
    } catch (err) {
        console.error("❌ ERROR fetching students:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// POST: Add a new student
app.post('/api/students', async (req, res) => {
    try {
        const { id, name, email, course } = req.body;
        
        // 1. Ensure roll_no is an integer (e.g., converts "S-1001" to 1001)
        const rollNo = parseInt(String(id).replace(/\D/g, ''), 10);
        
        // 2. Set defaults for your NOT NULL columns
        const admissionYear = new Date().getFullYear();
        const currentStatus = 'Active';

        // 3. Insert query includes defaults and calculates the next student_id dynamically
        const result = await pool.query(
            `INSERT INTO public.students (student_id, roll_no, full_name, email, department, admission_year, current_status) 
             VALUES (
                COALESCE((SELECT MAX(student_id) FROM public.students), 0) + 1, 
                $1, $2, $3, $4, $5, $6
             ) RETURNING *`,
            [rollNo, name, email, course, admissionYear, currentStatus]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});

// PUT: Update an existing student
app.put('/api/students/:id', async (req, res) => {
    try {
        const { id } = req.params; // this is the roll_no passed from frontend
        const { name, email, course } = req.body;
        const result = await pool.query(
            'UPDATE public.students SET full_name = $1, email = $2, department = $3 WHERE roll_no = $4 RETURNING *',
            [name, email, course, id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});

// DELETE: Remove a student
app.delete('/api/students/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM public.students WHERE roll_no = $1', [id]);
        res.json({ message: "Student deleted!" });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: err.message });
    }
});

// GET: Export entire database for Excel
app.get('/api/export-all', async (req, res) => {
    console.log("➡️ GET /api/export-all requested by frontend");
    try {
        const students = await pool.query('SELECT * FROM public.students');
        const school_records = await pool.query('SELECT * FROM public.school_records');
        const semesters = await pool.query('SELECT * FROM public.semesters');
        const subjects = await pool.query('SELECT * FROM public.subjects');
        const semester_marks = await pool.query('SELECT * FROM public.semester_marks');
        const academic_gaps = await pool.query('SELECT * FROM public.academic_gaps');
        const seminars = await pool.query('SELECT * FROM public.seminars');
        const student_seminars = await pool.query('SELECT * FROM public.student_seminars');
        const activities = await pool.query('SELECT * FROM public.activities');

        res.json({
            "Students": students.rows,
            "School_Records": school_records.rows,
            "Semesters": semesters.rows,
            "Subjects": subjects.rows,
            "Semester_Marks": semester_marks.rows,
            "Academic_Gaps": academic_gaps.rows,
            "Seminars": seminars.rows,
            "Student_Seminars": student_seminars.rows,
            "Activities": activities.rows
        });
        console.log("✅ Successfully exported all tables");
    } catch (err) {
        console.error("❌ Export Error:", err.message);
        res.status(500).json({ error: err.message });
    }
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
    console.log(`Test the API by visiting http://localhost:${port}/api/students`);
});