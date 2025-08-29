import { useState, useEffect } from 'react';
import { PlantType, GameState, Reward, Achievement } from '../types/PlantTypes';
import PlantVisualization from './PlantVisualisation';
import GameStats from './GameStats';
import { GameActions } from './GameActions';
import { PlantSelectionModal } from './PlantSelectionModal';
import BlockchainAchievements from './BlockchainAchievements';
import BlockchainWalletConnect from './BlockchainWalletConnect';

const plantTypes: PlantType[] = [
  {
    id: 'default',
    name: 'Green Leaf',
    difficulty: 'Easy',
    description: 'A classic green plant that grows steadily with basic care.',
    waterFrequency: 1,
    fertilizerBoost: 3,
    pestChance: 0.1,
    stages: ['default-seed', 'default-sprout', 'default-small-plant', 'default-medium-plant', 'default-tree'],
  },
  {
    id: 'flowering',
    name: 'Pink Bloom',
    difficulty: 'Medium',
    description: 'A beautiful flowering plant that requires more attention but grows faster.',
    waterFrequency: 1,
    fertilizerBoost: 5,
    pestChance: 0.2,
    stages: ['flowering-seed', 'flowering-sprout', 'flowering-small-plant', 'flowering-medium-plant', 'flowering-tree'],
    specialFeature: (growth: number) => {
      if (growth >= 40) {
        return (
          <div className="absolute w-4 h-4 bg-pink-400 rounded-t-full transform rotate-45 top-[-20px] left-1/2 -translate-x-1/2 z-10"></div>
        );
      }
      return null;
    },
  },
  {
    id: 'cactus',
    name: 'Desert Cactus',
    difficulty: 'Hard',
    description: 'A hardy cactus that needs less water but grows slower.',
    waterFrequency: 2,
    fertilizerBoost: 2,
    pestChance: 0.05,
    stages: ['cactus-seed', 'cactus-sprout', 'cactus-small-plant', 'cactus-medium-plant', 'cactus-tree'],
    specialFeature: (growth: number) => {
      if (growth >= 30) {
        return (
          <>
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="absolute w-1 h-3 bg-white transform"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  transform: `rotate(${Math.random() * 360}deg)`,
                }}
              ></div>
            ))}
          </>
        );
      }
      return null;
    },
  },
];

const rewards: Reward[] = [
  { streak: 7, decoration: 'ribbon', message: '7-day streak! You earned a ribbon!', tokens: 5 },
  { streak: 14, decoration: 'hat', message: '14-day streak! Your plant got a fancy hat!', tokens: 10 },
  { streak: 30, decoration: 'both', message: '30-day streak! Your plant is now a champion!', tokens: 25 },
];

const initialAchievements: Achievement[] = [
  {
    id: 'first-water',
    title: 'First Steps',
    description: 'Water your plant for the first time',
    completed: false,
    tokenReward: 2,
    verified: false
  },
  {
    id: 'three-day-streak',
    title: 'Consistency',
    description: 'Maintain a 3-day watering streak',
    completed: false,
    tokenReward: 5,
    verified: false
  },
  {
    id: 'first-growth',
    title: 'Growth Spurt',
    description: 'Reach 25% growth with any plant',
    completed: false,
    tokenReward: 3,
    verified: false
  },
  {
    id: 'pest-control',
    title: 'Pest Controller',
    description: 'Successfully treat plant pests',
    completed: false,
    tokenReward: 4,
    verified: false
  },
  {
    id: 'full-growth',
    title: 'Master Gardener',
    description: 'Grow a plant to 100% completion',
    completed: false,
    tokenReward: 15,
    verified: false
  }
];

const PlantCareGame = () => {
  const [gameState, setGameState] = useState<GameState>(() => {
    const savedState = localStorage.getItem('plantGameState');
    return savedState
      ? JSON.parse(savedState)
      : {
          days: 0,
          growth: 0,
          streak: 0,
          lastWatered: null,
          fertilized: false,
          pruned: false,
          hasPest: false,
          plantType: null,
          decorations: [],
          stellarTokens: 0,
          achievements: initialAchievements,
          walletConnected: false,
          walletAddress: null,
        };
  });

  const [showPlantModal, setShowPlantModal] = useState(false);
  const [showAchievementsModal, setShowAchievementsModal] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: string } | null>(null);

  useEffect(() => {
    localStorage.setItem('plantGameState', JSON.stringify(gameState));
  }, [gameState]);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const showNotification = (message: string, type = '') => {
    setNotification({ message, type });
  };

  const waterPlant = () => {
    const today = new Date().toDateString();
    const { lastWatered, plantType } = gameState;

    // Check if already watered today
    if (lastWatered === today) {
      showNotification("You've already watered your plant today!");
      return;
    }

    // Check if plant needs water based on type
    const lastWateredDate = lastWatered ? new Date(lastWatered) : null;
    const daysSinceWatered = lastWateredDate
      ? Math.floor((new Date().getTime() - lastWateredDate.getTime()) / (1000 * 60 * 60 * 24))
      : Infinity;

    if (daysSinceWatered < (plantType?.waterFrequency || 1)) {
      showNotification(`This plant only needs water every ${plantType?.waterFrequency} days!`, 'warning');
      return;
    }

    // Update growth and streak
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    let newStreak = gameState.streak;
    if (lastWatered === yesterday.toDateString()) {
      newStreak++;
      checkForRewards(newStreak);
    } else if (lastWatered !== today && lastWatered !== null) {
      newStreak = 1;
      showNotification("Streak reset! Water daily to maintain your streak.", 'warning');
    } else if (lastWatered === null) {
      newStreak = 1;
    }

    // Calculate growth based on care factors
    let growthIncrease = 5;
    if (gameState.fertilized) growthIncrease += plantType?.fertilizerBoost || 0;
    if (gameState.pruned) growthIncrease += 2;
    if (newStreak >= 7) growthIncrease += 2;
    if (gameState.hasPest) growthIncrease = Math.floor(growthIncrease * 0.5);

    const newGrowth = Math.min(gameState.growth + growthIncrease, 100);

    // Random chance for pests
    const newHasPest = Math.random() < (plantType?.pestChance || 0);

    // Check achievements
    const newAchievements = [...gameState.achievements];
    
    // First water achievement
    const firstWaterAchievement = newAchievements.find(a => a.id === 'first-water');
    if (firstWaterAchievement && !firstWaterAchievement.completed) {
      firstWaterAchievement.completed = true;
      showNotification(`Achievement unlocked: ${firstWaterAchievement.title}!`, 'success');
      
      // Simulate blockchain verification after 2 seconds
      setTimeout(() => {
        setGameState(prevState => {
          const updatedAchievements = prevState.achievements.map(a => 
            a.id === 'first-water' ? { ...a, verified: true } : a
          );
          const newTokens = prevState.stellarTokens + firstWaterAchievement.tokenReward;
          showNotification(`Verified on Monad! +${firstWaterAchievement.tokenReward} Stellar Tokens`, 'success');
          return {
            ...prevState,
            achievements: updatedAchievements,
            stellarTokens: newTokens
          };
        });
      }, 2000);
    }
    
    // 3-day streak achievement
    const streakAchievement = newAchievements.find(a => a.id === 'three-day-streak');
    if (streakAchievement && !streakAchievement.completed && newStreak >= 3) {
      streakAchievement.completed = true;
      showNotification(`Achievement unlocked: ${streakAchievement.title}!`, 'success');
      
      // Simulate blockchain verification after 3 seconds
      setTimeout(() => {
        setGameState(prevState => {
          const updatedAchievements = prevState.achievements.map(a => 
            a.id === 'three-day-streak' ? { ...a, verified: true } : a
          );
          const newTokens = prevState.stellarTokens + streakAchievement.tokenReward;
          showNotification(`Verified on Monad! +${streakAchievement.tokenReward} Stellar Tokens`, 'success');
          return {
            ...prevState,
            achievements: updatedAchievements,
            stellarTokens: newTokens
          };
        });
      }, 3000);
    }
    
    // Growth achievement
    const growthAchievement = newAchievements.find(a => a.id === 'first-growth');
    if (growthAchievement && !growthAchievement.completed && newGrowth >= 25) {
      growthAchievement.completed = true;
      showNotification(`Achievement unlocked: ${growthAchievement.title}!`, 'success');
      
      // Simulate blockchain verification after 2.5 seconds
      setTimeout(() => {
        setGameState(prevState => {
          const updatedAchievements = prevState.achievements.map(a => 
            a.id === 'first-growth' ? { ...a, verified: true } : a
          );
          const newTokens = prevState.stellarTokens + growthAchievement.tokenReward;
          showNotification(`Verified on Monad! +${growthAchievement.tokenReward} Stellar Tokens`, 'success');
          return {
            ...prevState,
            achievements: updatedAchievements,
            stellarTokens: newTokens
          };
        });
      }, 2500);
    }
    
    // Full growth achievement
    const fullGrowthAchievement = newAchievements.find(a => a.id === 'full-growth');
    if (fullGrowthAchievement && !fullGrowthAchievement.completed && newGrowth >= 100) {
      fullGrowthAchievement.completed = true;
      showNotification(`Achievement unlocked: ${fullGrowthAchievement.title}!`, 'success');
      
      // Simulate blockchain verification after 4 seconds
      setTimeout(() => {
        setGameState(prevState => {
          const updatedAchievements = prevState.achievements.map(a => 
            a.id === 'full-growth' ? { ...a, verified: true } : a
          );
          const newTokens = prevState.stellarTokens + fullGrowthAchievement.tokenReward;
          showNotification(`Verified on Monad! +${fullGrowthAchievement.tokenReward} Stellar Tokens`, 'success');
          return {
            ...prevState,
            achievements: updatedAchievements,
            stellarTokens: newTokens
          };
        });
      }, 4000);
    }

    setGameState({
      ...gameState,
      days: gameState.days + 1,
      growth: newGrowth,
      streak: newStreak,
      lastWatered: today,
      fertilized: false,
      pruned: false,
      hasPest: newHasPest,
      achievements: newAchievements,
    });

    showNotification(`Plant watered! Growth +${growthIncrease}%`, 'success');

    if (newHasPest) {
      showNotification("Oh no! Pests have attacked your plant!", 'danger');
    }
  };

  const fertilizePlant = () => {
    if (gameState.fertilized) {
      showNotification("You've already fertilized your plant!", 'warning');
      return;
    }

    setGameState({
      ...gameState,
      fertilized: true,
    });

    showNotification("Plant fertilized! Next watering will give extra growth.", 'success');
  };

  const prunePlant = () => {
    if (gameState.pruned) {
      showNotification("You've already pruned your plant today!", 'warning');
      return;
    }

    if (gameState.growth < 30) {
      showNotification("Your plant is too small to prune!", 'warning');
      return;
    }

    setGameState({
      ...gameState,
      pruned: true,
    });

    showNotification("Plant pruned! This will help it grow stronger.", 'success');
  };

  const treatPlant = () => {
    if (!gameState.hasPest) {
      showNotification("Your plant doesn't have pests!", 'warning');
      return;
    }

    const newAchievements = [...gameState.achievements];
    const pestAchievement = newAchievements.find(a => a.id === 'pest-control');
    
    if (pestAchievement && !pestAchievement.completed) {
      pestAchievement.completed = true;
      showNotification(`Achievement unlocked: ${pestAchievement.title}!`, 'success');
      
      // Simulate blockchain verification after 3 seconds
      setTimeout(() => {
        setGameState(prevState => {
          const updatedAchievements = prevState.achievements.map(a => 
            a.id === 'pest-control' ? { ...a, verified: true } : a
          );
          const newTokens = prevState.stellarTokens + pestAchievement.tokenReward;
          showNotification(`Verified on Monad! +${pestAchievement.tokenReward} Stellar Tokens`, 'success');
          return {
            ...prevState,
            achievements: updatedAchievements,
            stellarTokens: newTokens
          };
        });
      }, 3000);
    }

    setGameState({
      ...gameState,
      hasPest: false,
      achievements: newAchievements,
    });

    showNotification("Pests treated! Your plant is healthy again.", 'success');
  };

  const checkForRewards = (streak: number) => {
    const newReward = rewards.find(
      (reward) => streak === reward.streak && !gameState.decorations.includes(reward.decoration)
    );

    if (newReward) {
      const newTokens = gameState.stellarTokens + (newReward.tokens || 0);
      
      setGameState({
        ...gameState,
        decorations: [...gameState.decorations, newReward.decoration],
        stellarTokens: newTokens,
      });
      
      showNotification(
        `${newReward.message} ${newReward.tokens ? `+${newReward.tokens} Stellar Tokens` : ''}`, 
        'success'
      );
    }
  };

  const selectPlant = (plantType: PlantType) => {
    // Reset plant data when changing types
    if (gameState.plantType?.id !== plantType.id) {
      setGameState({
        days: 0,
        growth: 0,
        streak: 0,
        lastWatered: null,
        fertilized: false,
        pruned: false,
        hasPest: false,
        plantType,
        decorations: [],
        stellarTokens: gameState.stellarTokens, // Keep tokens
        achievements: gameState.achievements,   // Keep achievements
        walletConnected: gameState.walletConnected,
        walletAddress: gameState.walletAddress,
      });
    } else {
      setGameState({
        ...gameState,
        plantType,
      });
    }

    showNotification(`You're now caring for a ${plantType.name}!`, 'success');
  };

  const connectWallet = (address: string) => {
    setGameState({
      ...gameState,
      walletConnected: true,
      walletAddress: address,
      stellarTokens: gameState.stellarTokens + 2, // Bonus for connecting wallet
    });
    
    showNotification("Wallet connected successfully! +2 Stellar Tokens", 'success');
  };

  const getPlantMessage = () => {
    const { plantType, growth } = gameState;
    if (!plantType) return "Water your plant daily to help it grow and earn Stellar tokens!";

    if (growth >= 100) {
      return `Your ${plantType.name} has grown into a magnificent specimen! ${
        plantType.id === 'flowering' ? '🌸' : '🌳'
      }`;
    } else if (growth >= 80) {
      return `Your ${plantType.name} is now thriving! Keep going to earn more tokens.`;
    } else if (growth >= 60) {
      return `Your ${plantType.name} is growing beautifully! Achievements are being verified on Monad.`;
    } else if (growth >= 40) {
      return `Your ${plantType.name} is getting bushy! Earn Stellar tokens with consistent care.`;
    } else if (growth >= 20) {
      return `Your ${plantType.name} is growing nicely! Track your progress on the blockchain.`;
    } else if (growth >= 10) {
      return `Your ${plantType.name} has sprouted! Keep caring for it to unlock achievements.`;
    } else {
      return `Your ${plantType.name} seed is planted! Water daily to earn Stellar tokens.`;
    }
  };

  const checkNeedsWater = () => {
    const { lastWatered, plantType } = gameState;
    if (!lastWatered || !plantType) return false;

    const lastWateredDate = new Date(lastWatered);
    const daysSinceWatered = Math.floor(
      (new Date().getTime() - lastWateredDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    return daysSinceWatered >= plantType.waterFrequency;
  };

  const needsWater = checkNeedsWater();

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-950 to-blue-900 dark:from-gray-900 dark:to-blue-900 text-gray-800 dark:text-gray-100 p-5 flex justify-center items-center transition-colors duration-1000">
      <div className="max-w-md w-full bg-gradient-to-b from-gray-800 to-gray-700 shadow-blue-500/20 rounded-xl overflow-hidden shadow-lg transition-transform duration-300 hover:-translate-y-1">
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-4 text-center">
          <h1 className="text-xl font-bold">Stellar Plant Garden</h1>
          <div className="text-xs bg-blue-900 rounded-full px-2 py-1 inline-block mt-1">
            Powered by Monad • Verified by Screenpipe
          </div>
        </div>
        
        <div className="p-5 text-center">
          <GameStats 
            days={gameState.days} 
            growth={gameState.growth} 
            streak={gameState.streak}
            stellarTokens={gameState.stellarTokens}
            achievements={gameState.achievements.filter(a => a.verified).length}
          />
          
          <PlantVisualization
            plantType={gameState.plantType}
            growth={gameState.growth}
            hasPest={gameState.hasPest}
            decorations={gameState.decorations}
            streak={gameState.streak}
          />
          
          <p className={`mb-4 text-white ${needsWater && gameState.days > 0 ? 'text-red-500' : ''}`}>
            {getPlantMessage()}
          </p>
          
          <GameActions
            onWater={waterPlant}
            onFertilize={fertilizePlant}
            onPrune={prunePlant}
            onTreat={treatPlant}
            onChangePlant={() => setShowPlantModal(true)}
            onConnectWallet={() => setShowWalletModal(true)}
            onViewAchievements={() => setShowAchievementsModal(true)}
            fertilized={gameState.fertilized}
            pruned={gameState.pruned}
            hasPest={gameState.hasPest}
            growth={gameState.growth}
            walletConnected={gameState.walletConnected}
          />
        </div>
      </div>
      
      <PlantSelectionModal
        isOpen={showPlantModal}
        onClose={() => setShowPlantModal(false)}
        onSelect={selectPlant}
        currentPlantType={gameState.plantType}
        plantTypes={plantTypes}
      />
      
      <BlockchainWalletConnect 
        isOpen={showWalletModal}
        onClose={() => setShowWalletModal(false)}
        onConnect={connectWallet}
      />
      
      <BlockchainAchievements
        isOpen={showAchievementsModal}
        onClose={() => setShowAchievementsModal(false)}
        achievements={gameState.achievements}
        stellarTokens={gameState.stellarTokens}
        walletAddress={gameState.walletAddress}
      />
      
      {notification && (
        <div
          className={`fixed mt-20 right-5 p-4 rounded-lg shadow-lg text-white ${
            notification.type === 'warning'
              ? 'bg-yellow-400 text-gray-800'
              : notification.type === 'danger'
              ? 'bg-red-500'
              : notification.type === 'success'
              ? 'bg-green-500'
              : 'bg-teal-500'
          } transition-transform duration-300 ${
            notification ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          {notification.message}
        </div>
      )}
    </div>
  );
};

export default PlantCareGame;
