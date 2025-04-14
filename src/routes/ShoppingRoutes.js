import { Router } from 'express';
import {
  GetFoodAvailability,
  GetTopRestaurants,
  GetFoodsIn30Min,
  SearchFoods,
  GetAvailableOffers,
  RestaurantById,
} from '../controllers/index.js';

const router = Router();

router.get('/:pincode', GetFoodAvailability);
router.get('/top-restaurant/:pincode', GetTopRestaurants);
router.get('/foods-in-30-min/:pincode', GetFoodsIn30Min);
router.get('/search/:pincode', SearchFoods);
router.get('/offers/:pincode', GetAvailableOffers);
router.get('/restaurant/:id', RestaurantById);

export default router;