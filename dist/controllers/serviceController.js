"use strict";
// src/controllers/projectController.js
const { project } = require('../models/project');
const { User } = require('../models/user');
// GET all projects
exports.getAllprojects = async (req, res) => {
    try {
        const projects = await project.findAll({
            include: [{ model: User, attributes: ['id', 'username'] }],
        });
        res.json({ projects });
    }
    catch (err) {
        console.error('Error fetching projects:', err);
        res.status(500).json({ error: 'Failed to fetch projects' });
    }
};
// CREATE a new project
exports.createproject = async (req, res) => {
    try {
        const { title, description, price } = req.body;
        const userId = req.user.id;
        if (!title || !description || !price) {
            return res.status(400).json({ error: 'All fields are required' });
        }
        const newproject = await project.create({
            title,
            description,
            price: parseFloat(price),
            userId,
        });
        res.status(201).json({ project: newproject });
    }
    catch (err) {
        console.error('Error creating project:', err);
        res.status(500).json({ error: 'Failed to create project' });
    }
};
// UPDATE a project
exports.updateproject = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, price } = req.body;
        const project = await project.findByPk(id);
        if (!project)
            return res.status(404).json({ error: 'project not found' });
        if (project.userId !== req.user.id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        await project.update({ title, description, price });
        res.json({ project });
    }
    catch (err) {
        console.error('Error updating project:', err);
        res.status(500).json({ error: 'Failed to update project' });
    }
};
// DELETE a project
exports.deleteproject = async (req, res) => {
    try {
        const { id } = req.params;
        const project = await project.findByPk(id);
        if (!project)
            return res.status(404).json({ error: 'project not found' });
        if (project.userId !== req.user.id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        await project.destroy();
        res.json({ message: 'project deleted' });
    }
    catch (err) {
        console.error('Error deleting project:', err);
        res.status(500).json({ error: 'Failed to delete project' });
    }
};


