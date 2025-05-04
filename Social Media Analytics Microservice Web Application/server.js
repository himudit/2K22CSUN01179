// server.js
require('dotenv').config();
const express = require('express');
const axios = require('axios');
const app = express();

// Constants
const BEARER_TOKEN = process.env.BEARER_TOKEN;
const API_URL = process.env.API_URL;

// Middleware to verify Bearer token
const authenticate = (req, res, next) => {
  const token = req.headers['authorization'];
  if (token && token.startsWith('Bearer ')) {
    if (token === `Bearer ${BEARER_TOKEN}`) {
      next(); // Proceed if token is valid
    } else {
      res.status(403).json({ message: 'Forbidden: Invalid token' });
    }
  } else {
    res.status(401).json({ message: 'Unauthorized: No token provided' });
  }
};

// Fetch all users from the social media API
const getUsers = async () => {
  try {
    const response = await axios.get(`${API_URL}/users`, {
      headers: {
        'Authorization': `Bearer ${BEARER_TOKEN}`
      }
    });
    return response.data.users;
  } catch (error) {
    console.error('Error fetching users:', error);
    return {};
  }
};

// Fetch posts of a user from the social media API
const getPosts = async (userId) => {
  try {
    const response = await axios.get(`${API_URL}/users/${userId}/posts`, {
      headers: {
        'Authorization': `Bearer ${BEARER_TOKEN}`
      }
    });
    return response.data.posts;
  } catch (error) {
    console.error(`Error fetching posts for user ${userId}:`, error);
    return [];
  }
};

// Fetch comments for a post
const getComments = async (postId) => {
  try {
    const response = await axios.get(`${API_URL}/posts/${postId}/comments`, {
      headers: {
        'Authorization': `Bearer ${BEARER_TOKEN}`
      }
    });
    return response.data.comments;
  } catch (error) {
    console.error(`Error fetching comments for post ${postId}:`, error);
    return [];
  }
};

// Top Users Endpoint
app.get('/users', authenticate, async (req, res) => {
  try {
    const users = await getUsers();
    const userCommentCounts = {};

    // Count the comments for each user
    for (const userId in users) {
      const posts = await getPosts(userId);
      let totalComments = 0;

      for (const post of posts) {
        const comments = await getComments(post.id);
        totalComments += comments.length;
      }

      userCommentCounts[userId] = totalComments;
    }

    // Sort users by comment count and get the top 5
    const topUsers = Object.entries(userCommentCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([userId]) => users[userId]);

    res.json({ topUsers });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching top users', error });
  }
});

// Top/Latest Posts Endpoint
app.get('/posts', authenticate, async (req, res) => {
  const { type } = req.query;

  if (!['latest', 'popular'].includes(type)) {
    return res.status(400).json({ message: 'Invalid query parameter type. Use "latest" or "popular".' });
  }

  try {
    const postsData = [];
    const users = await getUsers();

    // Fetch all posts for each user
    for (const userId in users) {
      const posts = await getPosts(userId);
      for (const post of posts) {
        const comments = await getComments(post.id);
        postsData.push({ ...post, commentsCount: comments.length });
      }
    }

    if (type === 'popular') {
      // Get the post(s) with the maximum comments count
      const maxComments = Math.max(...postsData.map(p => p.commentsCount));
      const popularPosts = postsData.filter(p => p.commentsCount === maxComments);
      res.json({ popularPosts });
    } else if (type === 'latest') {
      // Get the latest 5 posts (sorted by post ID)
      const latestPosts = postsData.sort((a, b) => b.id - a.id).slice(0, 5);
      res.json({ latestPosts });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error fetching posts', error });
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
