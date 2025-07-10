import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { supabase } from '../services/supabase.service';
import logger from '../config/logger';

class HomeController {
  getTrickOfTheDay = async (req: Request, res: Response) => {
    try {
      // Fetch all tricks first
      const { data: tricks, error: tricksError } = await supabase
        .from('tricks')
        .select('*');

      if (tricksError) {
        throw tricksError;
      }

      if (!tricks || tricks.length === 0) {
        return res.status(StatusCodes.NOT_FOUND).json({ 
          success: false,
          message: 'No tricks found in the database.' 
        });
      }

      // Select a random trick
      const randomTrick = tricks[Math.floor(Math.random() * tricks.length)];

      return res.status(StatusCodes.OK).json({
        success: true,
        data: randomTrick,
      });
    } catch (error) {
      logger.error('Error fetching trick of the day:', error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to fetch trick of the day',
      });
    }
  };

  getDailyChallenges = async (req: Request, res: Response) => {
    try {
      const { data, error } = await supabase
        .from('daily_challenges')
        .select('*')
        .eq('is_active', true);

      if (error) {
        throw error;
      }

      return res.status(StatusCodes.OK).json({
        success: true,
        data: data || [],
      });
    } catch (error) {
      logger.error('Error fetching daily challenges:', error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to fetch daily challenges',
      });
    }
  };
}

export const homeController = new HomeController(); 