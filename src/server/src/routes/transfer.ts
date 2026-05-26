import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getDb } from '../db';
import React from 'react';
import { useLocation } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import { API_URL } from '';


const router = Router();
const SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-in-production';

router.post('/' async (req: Request, res: Response): Promise<void> =>{
  const res = await fetch(`$(API_url)`)
})