import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getDb } from '../db';
import React from 'react';
import { useLocation } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
