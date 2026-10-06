import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Button,
  Flex,
  SimpleGrid,
  Text,
  VStack,
  HStack,
  useToast,
  FormControl,
  FormLabel,
  Input,
  IconButton,
  Select,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter
} from '@chakra-ui/react';
import { DeleteIcon, AddIcon, EditIcon, CheckIcon, CloseIcon } from '@chakra-ui/icons';
import { AdminPageHeader, AdminPanel } from '../components/admin/MatchDay';

// 선수 타입 (포지션 정보 제거)
interface Player {
  id: string;
  name: string;
  team?: 'A' | 'B';
}

// 축구장 위 선수 위치 타입
interface PlayerPosition {
  id: string;
  x: number;
  y: number;
}

interface FootballFieldPageProps {
  memberList?: Player[];
  games?: any[];
}

export default function FootballFieldPage({ memberList: propMemberList, games }: FootballFieldPageProps) {
  const toast = useToast();
  const fieldRef = useRef<HTMLDivElement>(null);

  // 팀 선택 상태 (localStorage에서 우선 로드)
  const [selectedTeam, setSelectedTeam] = useState<'A' | 'B' | null>(() => {
    try {
      const saved = localStorage.getItem('futsalSelectedTeam');
      const parsed = saved ? JSON.parse(saved) : null;
      return parsed === 'A' || parsed === 'B' ? parsed : null;
    } catch {
      return null;
    }
  });
  
  // 선택된 선수들 (localStorage에서 우선 로드)
  const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('futsalSelectedPlayers');
      const parsed = saved ? JSON.parse(saved) : [];
      return new Set(Array.isArray(parsed) ? parsed : []);
    } catch {
      return new Set();
    }
  });

  // 회원명단 (props에서 받은 실제 회원 데이터 사용)
  const [memberList, setMemberList] = useState<Player[]>(() => {
    // props에서 받은 실제 회원 데이터가 있으면 사용
    if (propMemberList && propMemberList.length > 0) {
      const convertedMembers = propMemberList.map(member => ({
        id: String(member.id), // id를 문자열로 변환
        name: String(member.name) // name도 문자열로 변환
      }));
      console.log('✅ 실제 회원 데이터 사용:', convertedMembers.length, '명');
      return convertedMembers;
    }
    
    // props가 없으면 localStorage에서 로드
    try {
      const saved = localStorage.getItem('futsalMemberList');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('futsalMemberList 로드 실패, 빈 배열 사용');
    }
    return [];
  });

  // 용병 목록 (삭제됨)
  const mercenaryList: Player[] = [];

  // 수기 입력 선수
  const [newPlayerName, setNewPlayerName] = useState<string>('');
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [editPlayerName, setEditPlayerName] = useState<string>('');
  
  // 용병 관리 상태
  const [editingGuestPlayer, setEditingGuestPlayer] = useState<Player | null>(null);
  const [editGuestPlayerName, setEditGuestPlayerName] = useState<string>('');
  
  // 용병 이름 저장 (localStorage에서 우선 로드)
  const [guestPlayerNames, setGuestPlayerNames] = useState<{[key: string]: string}>(() => {
    try {
      const saved = localStorage.getItem('futsalGuestPlayerNames');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [selectedGameDate, setSelectedGameDate] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('futsalSelectedGameDate');
      return saved || '';
    } catch {
      return '';
    }
  });

  // 팀별 선수 목록 (localStorage에서 우선 로드)
  const [teamA, setTeamA] = useState<Player[]>(() => {
    try {
      const saved = localStorage.getItem('futsalTeamA');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  
  const [teamB, setTeamB] = useState<Player[]>(() => {
    try {
      const saved = localStorage.getItem('futsalTeamB');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // 축구장 위 선수 위치 (localStorage에서 우선 로드)
  const [playerPositions, setPlayerPositions] = useState<PlayerPosition[]>(() => {
    try {
      const saved = localStorage.getItem('futsalPlayerPositions');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // 드래그 상태
  const [draggedPlayer, setDraggedPlayer] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // 파괴적 로컬 작업(선수 삭제 / 경기 리셋) 확인 모달 상태
  const [confirmDialog, setConfirmDialog] = useState<{ type: 'deletePlayer'; player: Player } | { type: 'reset' } | null>(null);

  // 실시간 데이터 동기화 (상태 변경 시 즉시 localStorage 저장)
  const saveToLocalStorage = (key: string, data: any) => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      console.log(`✅ ${key} 저장 완료:`, data);
    } catch (error) {
      console.error(`❌ ${key} 저장 실패:`, error);
    }
  };

  // 상태 변경 시 즉시 localStorage에 저장
  useEffect(() => {
    saveToLocalStorage('futsalTeamA', teamA);
  }, [teamA]);

  useEffect(() => {
    saveToLocalStorage('futsalTeamB', teamB);
  }, [teamB]);

  useEffect(() => {
    saveToLocalStorage('futsalPlayerPositions', playerPositions);
  }, [playerPositions]);

  useEffect(() => {
    saveToLocalStorage('futsalSelectedTeam', selectedTeam);
  }, [selectedTeam]);

  useEffect(() => {
    saveToLocalStorage('futsalSelectedPlayers', Array.from(selectedPlayers));
  }, [selectedPlayers]);

  useEffect(() => {
    saveToLocalStorage('futsalMemberList', memberList);
  }, [memberList]);

  useEffect(() => {
    saveToLocalStorage('futsalGuestPlayerNames', guestPlayerNames);
  }, [guestPlayerNames]);

  // props에서 받은 실제 회원 데이터가 변경될 때 memberList 업데이트 (용병 이름 수정 사항 보존)
  useEffect(() => {
    if (propMemberList && propMemberList.length > 0) {
      const convertedMembers = propMemberList.map(member => ({
        id: String(member.id), // id를 문자열로 변환
        name: String(member.name) // name도 문자열로 변환
      }));
      
      // 기존 memberList에서 용병 이름 수정 사항 보존
      setMemberList(prev => {
        const newList = [...convertedMembers];
        
        // 기존 용병들의 수정된 이름 보존
        prev.forEach(existingMember => {
          if (existingMember.id.startsWith('guest_')) {
            const existingIndex = newList.findIndex(m => m.id === existingMember.id);
            if (existingIndex >= 0) {
              newList[existingIndex] = existingMember; // 수정된 이름 유지
            } else {
              newList.push(existingMember); // 새로운 용병 추가
            }
          }
        });
        
        console.log('✅ 실제 회원 데이터 업데이트 (용병 이름 보존):', newList.length, '명');
        return newList;
      });
    }
  }, [propMemberList]);

  // 확정된 경기 목록 가져오기
  const getConfirmedGames = () => {
    console.log('🔍 getConfirmedGames 호출됨');
    console.log('games 데이터:', games);
    console.log('games 타입:', typeof games);
    console.log('games 길이:', games?.length);
    
    if (!games || !Array.isArray(games)) {
      console.log('❌ games 데이터가 없거나 배열이 아님');
      return [];
    }
    
    // 첫 번째 경기의 전체 구조 출력
    if (games.length > 0) {
      console.log('📋 첫 번째 경기 전체 구조:', games[0]);
      console.log('📋 첫 번째 경기 키들:', Object.keys(games[0]));
    }
    
    const confirmedGames = games.filter(game => {
      console.log('경기 상태 확인:', game.id, game.status);
      console.log('전체 경기 데이터:', game);
      
      // 모든 가능한 상태 필드 확인
      const possibleStatusFields = [
        'status', 'state', 'confirmed', 'isConfirmed', 'gameStatus', 
        'matchStatus', 'isActive', 'active', 'enabled', 'isEnabled'
      ];
      
      let foundStatus = null;
      for (const field of possibleStatusFields) {
        if (game[field] !== undefined) {
          foundStatus = game[field];
          console.log(`✅ 상태 필드 발견: ${field} = ${foundStatus}`);
          break;
        }
      }
      
      if (!foundStatus) {
        console.log('❌ 상태 필드를 찾을 수 없음. 모든 필드:', Object.keys(game));
        // 상태 필드가 없으면 모든 경기를 확정된 것으로 간주
        return true;
      }
      
      // 다양한 상태값 허용
      const isConfirmed = foundStatus === 'CONFIRMED' || 
                        foundStatus === 'confirmed' || 
                        foundStatus === true || 
                        foundStatus === 'true' ||
                        foundStatus === 'ACTIVE' ||
                        foundStatus === 'active';
      
      console.log('최종 확정 여부:', isConfirmed);
      return isConfirmed;
    });
    
    console.log('✅ 확정된 경기 수:', confirmedGames.length);
    return confirmedGames;
  };

  // 선택한 날짜의 투표 인원 가져오기 - 완전히 새로운 간단한 방식
  const getVotedMembers = (gameDate: string) => {
    console.log('🚀 새로운 방식으로 getVotedMembers 호출됨');
    console.log('gameDate:', gameDate);
    
    if (!games || !gameDate) {
      console.log('❌ games 또는 gameDate가 없음');
      return [];
    }
    
    const game = games.find(g => g.date === gameDate);
    console.log('찾은 경기:', game);
    
    if (!game) {
      console.log('❌ 해당 날짜의 경기를 찾을 수 없음');
      return [];
    }
    
    console.log('🎯 경기 데이터 분석:');
    console.log('- selectedMembers:', game.selectedMembers);
    console.log('- mercenaryCount:', game.mercenaryCount);
    console.log('- propMemberList:', propMemberList);
    console.log('- propMemberList 이름들:', propMemberList?.map(m => m.name));
    
    const votedMembers = [];
    
    // 1. selectedMembers 처리 (문자열로 저장된 JSON 파싱)
    if (game.selectedMembers) {
      console.log('✅ selectedMembers 처리 시작:', game.selectedMembers);
      
      let selectedMembersArray = [];
      try {
        // 문자열인 경우 JSON 파싱
        if (typeof game.selectedMembers === 'string') {
          selectedMembersArray = JSON.parse(game.selectedMembers);
        } else if (Array.isArray(game.selectedMembers)) {
          selectedMembersArray = game.selectedMembers;
        }
        console.log('📋 파싱된 selectedMembers:', selectedMembersArray);
      } catch (error) {
        console.error('❌ selectedMembers 파싱 오류:', error);
        selectedMembersArray = [];
      }
      
      selectedMembersArray.forEach((memberName: string) => {
        console.log('🔍 찾는 회원명:', memberName);
        console.log('🔍 전체 회원 목록:', propMemberList?.map(m => ({ id: m.id, name: m.name })));
        
        // 정확한 매칭을 위해 trim() 사용
        const member = (propMemberList || []).find(m => m.name.trim() === memberName.trim());
        console.log('🔍 찾은 회원:', member);
        
        if (member) {
          votedMembers.push({
            id: String(member.id),
            name: String(member.name)
          });
          console.log('✅ 회원 추가:', memberName, '→ ID:', member.id);
        } else {
          console.log('❌ 회원을 찾을 수 없음:', memberName);
          console.log('전체 회원 목록:', propMemberList?.map(m => m.name));
          console.log('정확한 매칭 시도:', propMemberList?.map(m => ({ 
            name: m.name, 
            trimmed: m.name.trim(), 
            target: memberName.trim(),
            match: m.name.trim() === memberName.trim()
          })));
        }
      });
    }
    
    // 2. 용병 추가
    if (game.mercenaryCount && game.mercenaryCount > 0) {
      console.log('✅ 용병 추가 시작:', game.mercenaryCount, '명');
      
      for (let i = 1; i <= game.mercenaryCount; i++) {
        // guestPlayerNames에서 수정된 이름이 있는지 확인
        const guestId = `guest_${i}`;
        const displayName = guestPlayerNames[guestId] || `용병${i}`;
        
        votedMembers.push({
          id: guestId,
          name: displayName
        });
        console.log('✅ 용병 추가:', displayName);
      }
    }
    
    // 3. 수기 입력된 회원들 추가 (memberNames에서 selectedMembers에 없는 회원들)
    if (game.memberNames) {
      console.log('✅ 수기 입력 회원 처리 시작:', game.memberNames);
      
      let memberNamesArray = [];
      try {
        // 문자열인 경우 JSON 파싱
        if (typeof game.memberNames === 'string') {
          memberNamesArray = JSON.parse(game.memberNames);
        } else if (Array.isArray(game.memberNames)) {
          memberNamesArray = game.memberNames;
        }
        console.log('📋 파싱된 memberNames:', memberNamesArray);
      } catch (error) {
        console.error('❌ memberNames 파싱 오류:', error);
        memberNamesArray = [];
      }
      
      // selectedMembers에 없는 회원들 찾기
      const selectedMembersArray = [];
      try {
        if (typeof game.selectedMembers === 'string') {
          const parsed = JSON.parse(game.selectedMembers);
          selectedMembersArray.push(...parsed);
        } else if (Array.isArray(game.selectedMembers)) {
          selectedMembersArray.push(...game.selectedMembers);
        }
      } catch (error) {
        console.error('❌ selectedMembers 파싱 오류:', error);
      }
      
      memberNamesArray.forEach((memberName: string) => {
        // selectedMembers에 없고, 용병이 아닌 경우만 추가
        if (!selectedMembersArray.includes(memberName) && !memberName.startsWith('용병')) {
          votedMembers.push({
            id: `manual_${memberName}`,
            name: memberName
          });
          console.log('✅ 수기 입력 회원 추가:', memberName);
        }
      });
    }
    
    console.log('🎉 최종 투표 인원:', votedMembers.length, '명');
    console.log('📋 투표 인원 목록:', votedMembers);
    
    return votedMembers;
  };

  // 투표한 인원과 나머지 인원 분리
  const getVotedAndNonVotedMembers = () => {
    if (!selectedGameDate) {
      return {
        votedMembers: [],
        nonVotedMembers: memberList
      };
    }
    
    const votedMembers = getVotedMembers(selectedGameDate);
    console.log('🔍 getVotedAndNonVotedMembers - votedMembers:', votedMembers);
    
    const votedMemberIds = votedMembers.map(member => String(member.id));
    console.log('🔍 getVotedAndNonVotedMembers - votedMemberIds:', votedMemberIds);
    
    // 전체 회원명단에서 나머지 인원 찾기
    const allMembers = propMemberList || [];
    const nonVotedMembers = allMembers.filter(member => 
      !votedMemberIds.includes(String(member.id))
    ).map(member => ({
      id: String(member.id),
      name: String(member.name)
    }));
    
    console.log('🔍 getVotedAndNonVotedMembers - nonVotedMembers:', nonVotedMembers);
    
    // votedMembers는 이미 올바른 형태로 반환되므로 그대로 사용
    const result = {
      votedMembers: votedMembers, // 이미 올바른 형태
      nonVotedMembers: nonVotedMembers.map(member => {
        let displayName = String(member.name);
        
        // 용병 이름 변환
        if (String(member.id).startsWith('guest_')) {
          const guestNumber = String(member.id).replace('guest_', '');
          displayName = `용병${guestNumber}`;
        }
        
        return {
          id: String(member.id),
          name: displayName
        };
      })
    };
    
    console.log('🔍 getVotedAndNonVotedMembers - 최종 결과:', result);
    return result;
  };

  // 날짜 변경 시 회원명단 업데이트 (전체 회원명단 유지)
  useEffect(() => {
    if (propMemberList && propMemberList.length > 0) {
      const convertedMembers = propMemberList.map(member => ({
        id: String(member.id),
        name: String(member.name)
      }));
      setMemberList(convertedMembers);
      console.log('✅ 전체 회원명단 유지:', convertedMembers.length, '명');
    }
  }, [propMemberList]);

  // 페이지 언로드 시 최종 저장 (안전장치)
  useEffect(() => {
    const handleBeforeUnload = () => {
      // 모든 상태를 한 번에 저장
      saveToLocalStorage('futsalTeamA', teamA);
      saveToLocalStorage('futsalTeamB', teamB);
      saveToLocalStorage('futsalPlayerPositions', playerPositions);
      saveToLocalStorage('futsalSelectedTeam', selectedTeam);
      saveToLocalStorage('futsalSelectedPlayers', Array.from(selectedPlayers));
      saveToLocalStorage('futsalMemberList', memberList);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [teamA, teamB, playerPositions, selectedTeam, selectedPlayers, memberList]);

  // 모든 선수 목록
  const allPlayers = [...memberList, ...mercenaryList];

  // 팀 배정
  const handleAssignTeam = () => {
    if (!selectedTeam) {
      toast({
        title: '팀을 먼저 선택해주세요',
        status: 'warning',
        duration: 2000,
        isClosable: true,
      });
      return;
    }

    if (selectedPlayers.size === 0) {
      toast({
        title: '선수를 선택해주세요',
        status: 'warning',
        duration: 2000,
        isClosable: true,
      });
      return;
    }

    const playersToAssign = allPlayers.filter(player => selectedPlayers.has(player.id));
    
    // 중복 배정 방지: 이미 팀에 배정된 선수들 필터링
    const availablePlayers = playersToAssign.filter(player => {
      const isInTeamA = teamA.some(p => p.id === player.id);
      const isInTeamB = teamB.some(p => p.id === player.id);
      return !isInTeamA && !isInTeamB;
    });

    if (availablePlayers.length === 0) {
      toast({
        title: '선택된 선수들이 이미 팀에 배정되어 있습니다',
        status: 'warning',
        duration: 2000,
        isClosable: true,
      });
      return;
    }

    // 선택된 팀에 추가
    if (selectedTeam === 'A') {
      setTeamA(prev => {
        const updated = [...prev, ...availablePlayers.map(p => ({ ...p, team: 'A' as const }))];
        console.log('✅ A팀 배정 완료:', availablePlayers.map(p => p.name), '총 인원:', updated.length);
        return updated;
      });
    } else {
      setTeamB(prev => {
        const updated = [...prev, ...availablePlayers.map(p => ({ ...p, team: 'B' as const }))];
        console.log('✅ B팀 배정 완료:', availablePlayers.map(p => p.name), '총 인원:', updated.length);
        return updated;
      });
    }

    // 축구장 위 위치 초기화
    setPlayerPositions(prev => {
      const newPositions = prev.filter(pos => !selectedPlayers.has(pos.id));
      const addedPositions = availablePlayers.map(player => ({
        id: player.id,
        x: selectedTeam === 'A' ? 25 : 75,
        y: 20 + Math.random() * 60
      }));
      const updated = [...newPositions, ...addedPositions];
      console.log('✅ 선수 위치 초기화 완료:', updated.length);
      return updated;
    });

    // 선택 초기화
    setSelectedPlayers(new Set());
    setSelectedTeam(null);
    
    toast({
      title: '팀 배정 완료',
      description: `${availablePlayers.length}명이 ${selectedTeam}팀에 배정되었습니다`,
      status: 'success',
      duration: 2000,
      isClosable: true,
    });
  };

  // 수기 입력 선수 추가
  const handleAddManualPlayer = () => {
    if (!newPlayerName.trim()) {
      toast({
        title: '선수명을 입력해주세요',
        status: 'error',
        duration: 2000,
        isClosable: true,
      });
      return;
    }

    const newPlayer: Player = {
      id: `manual_${Date.now()}`,
      name: newPlayerName.trim()
    };

    // 수기 입력 선수를 memberList에 추가
    setMemberList(prev => {
      const updated = [...prev, newPlayer];
      console.log('✅ 수기 입력 선수 추가:', newPlayer.name, '전체 회원:', updated.length);
      return updated;
    });

    // 팀이 선택된 상태라면 자동으로 해당 팀에 배정
    if (selectedTeam) {
      const playerWithTeam = { ...newPlayer, team: selectedTeam };
      
      if (selectedTeam === 'A') {
        setTeamA(prev => {
          const updated = [...prev, playerWithTeam];
          console.log('✅ A팀 자동 배정:', newPlayer.name, '총 인원:', updated.length);
          return updated;
        });
      } else {
        setTeamB(prev => {
          const updated = [...prev, playerWithTeam];
          console.log('✅ B팀 자동 배정:', newPlayer.name, '총 인원:', updated.length);
          return updated;
        });
      }

      // 축구장 위 위치 초기화
      setPlayerPositions(prev => {
        const newPosition = {
          id: newPlayer.id,
          x: selectedTeam === 'A' ? 25 : 75,
          y: 20 + Math.random() * 60
        };
        const updated = [...prev, newPosition];
        console.log('✅ 선수 위치 초기화:', newPlayer.name, '위치:', newPosition);
        return updated;
      });

      toast({
        title: '수기 입력 선수 추가 및 팀 배정 완료',
        description: `${newPlayer.name}이(가) ${selectedTeam}팀에 자동 배정되었습니다`,
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
    } else {
      toast({
        title: '수기 입력 선수가 추가되었습니다',
        description: `${newPlayer.name}이(가) 회원명단에 추가되었습니다`,
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
    }

    setNewPlayerName('');
  };

  // 수기 입력 선수 수정 시작
  const handleStartEdit = (player: Player) => {
    setEditingPlayer(player);
    setEditPlayerName(player.name);
  };

  // 수기 입력 선수 수정 완료
  const handleSaveEdit = () => {
    if (!editingPlayer || !editPlayerName.trim()) {
      toast({
        title: '선수명을 입력해주세요',
        status: 'error',
        duration: 2000,
        isClosable: true,
      });
      return;
    }

    const updatedPlayer = { ...editingPlayer, name: editPlayerName.trim() };

    // memberList에서 수정
    setMemberList(prev => {
      const updated = prev.map(p => p.id === editingPlayer.id ? updatedPlayer : p);
      console.log('✅ 수기 입력 선수 수정:', updatedPlayer.name);
      return updated;
    });

    // 팀에서도 수정 (해당 팀에 있다면)
    if (editingPlayer.team === 'A') {
      setTeamA(prev => {
        const updated = prev.map(p => p.id === editingPlayer.id ? updatedPlayer : p);
        console.log('✅ A팀에서 선수 수정:', updatedPlayer.name);
        return updated;
      });
    } else if (editingPlayer.team === 'B') {
      setTeamB(prev => {
        const updated = prev.map(p => p.id === editingPlayer.id ? updatedPlayer : p);
        console.log('✅ B팀에서 선수 수정:', updatedPlayer.name);
        return updated;
      });
    }

    setEditingPlayer(null);
    setEditPlayerName('');

    toast({
      title: '선수명이 수정되었습니다',
      description: `${updatedPlayer.name}으로 변경되었습니다`,
      status: 'success',
      duration: 2000,
      isClosable: true,
    });
  };

  // 수기 입력 선수 수정 취소
  const handleCancelEdit = () => {
    setEditingPlayer(null);
    setEditPlayerName('');
  };

  // 수기 입력 선수 삭제
  const handleDeleteManualPlayer = (player: Player) => {
    // memberList에서 삭제
    setMemberList(prev => {
      const updated = prev.filter(p => p.id !== player.id);
      console.log('✅ 수기 입력 선수 삭제:', player.name, '남은 인원:', updated.length);
      return updated;
    });

    // 팀에서도 삭제 (해당 팀에 있다면)
    if (player.team === 'A') {
      setTeamA(prev => {
        const updated = prev.filter(p => p.id !== player.id);
        console.log('✅ A팀에서 선수 삭제:', player.name, '남은 인원:', updated.length);
        return updated;
      });
    } else if (player.team === 'B') {
      setTeamB(prev => {
        const updated = prev.filter(p => p.id !== player.id);
        console.log('✅ B팀에서 선수 삭제:', player.name, '남은 인원:', updated.length);
        return updated;
      });
    }

    // 축구장 위 위치도 삭제
    setPlayerPositions(prev => {
      const updated = prev.filter(p => p.id !== player.id);
      console.log('✅ 선수 위치 삭제:', player.name);
      return updated;
    });

    toast({
      title: '선수가 삭제되었습니다',
      description: `${player.name}이(가) 삭제되었습니다`,
      status: 'success',
      duration: 2000,
      isClosable: true,
    });
  };

  // 용병 이름 수정 시작
  const handleStartEditGuestPlayer = (player: Player) => {
    setEditingGuestPlayer(player);
    setEditGuestPlayerName(player.name);
  };

  // 용병 이름 수정 저장
  const handleSaveEditGuestPlayer = () => {
    if (!editingGuestPlayer || !editGuestPlayerName.trim()) return;
    
    const newName = editGuestPlayerName.trim();
    const guestId = editingGuestPlayer.id;
    
    // guestPlayerNames에 저장
    setGuestPlayerNames(prev => ({
      ...prev,
      [guestId]: newName
    }));
    
    // memberList 업데이트
    setMemberList(prev => prev.map(p => p.id === guestId ? { ...p, name: newName } : p));
    
    // 팀에서도 업데이트
    setTeamA(prev => prev.map(p => p.id === guestId ? { ...p, name: newName } : p));
    setTeamB(prev => prev.map(p => p.id === guestId ? { ...p, name: newName } : p));
    
    setEditingGuestPlayer(null);
    setEditGuestPlayerName('');
    
    toast({ title: '용병 이름 수정 완료', description: `${newName}으로 변경되었습니다`, status: 'success' });
  };

  // 용병 이름 수정 취소
  const handleCancelEditGuestPlayer = () => {
    setEditingGuestPlayer(null);
    setEditGuestPlayerName('');
  };

  // 팀 구성 공유 기능
  const shareTeamComposition = (platform: 'kakao' | 'email') => {
    if (teamA.length === 0 && teamB.length === 0) {
      toast({
        title: '공유할 팀 구성이 없습니다',
        description: 'A팀 또는 B팀에 선수를 배정한 후 공유해주세요',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    const gameInfo = selectedGameDate ? 
      games?.find(g => g.date === selectedGameDate) : null;
    
    const gameDate = gameInfo ? 
      new Date(gameInfo.date).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long'
      }) : '미정';

    // 경기 정보 추가
    const gameLocation = gameInfo?.location || '미정';
    const totalPlayers = teamA.length + teamB.length;
    
    // 팀 구성 표 형태로 정리
    const maxPlayers = Math.max(teamA.length, teamB.length, 4); // 최소 4명까지 표시
    const teamTable = `팀 구성표
A팀(${teamA.length}명)   | B팀(${teamB.length}명)
${Array.from({ length: maxPlayers }, (_, i) => {
  const playerA = teamA[i] ? `${i + 1}. ${teamA[i].name}` : `${i + 1}.`;
  const playerB = teamB[i] ? `${i + 1}. ${teamB[i].name}` : `${i + 1}.`;
  return `${playerA.padEnd(15)} | ${playerB}`;
}).join('\n')}`;

    const shareContent = `⚽ 풋살 경기 팀 구성 공유

📅 경기 날짜: ${gameDate}
📍 경기 장소: ${gameLocation}
👥 전체 인원: ${totalPlayers}명

${teamTable}

🏆 좋은 경기 되세요!`;

    if (platform === 'kakao') {
      // 카카오톡 공유 (Web Share API 사용)
      if (navigator.share) {
        navigator.share({
          title: '풋살 경기 팀 구성',
          text: shareContent,
          url: 'https://fccg.vercel.app' // 공개 URL로 변경
        }).catch(err => {
          console.error('카카오톡 공유 실패:', err);
          toast({
            title: '카카오톡 공유 실패',
            description: '수동으로 복사하여 공유해주세요',
            status: 'error',
            duration: 3000,
            isClosable: true,
          });
        });
      } else {
        // Web Share API가 지원되지 않는 경우 클립보드에 복사
        navigator.clipboard.writeText(shareContent).then(() => {
          toast({
            title: '팀 구성이 클립보드에 복사되었습니다',
            description: '카카오톡에 붙여넣기하여 공유해주세요',
            status: 'success',
            duration: 3000,
            isClosable: true,
          });
        });
      }
    } else if (platform === 'email') {
      // 이메일 공유
      const subject = `풋살 경기 팀 구성 - ${gameDate}`;
      const body = shareContent;
      const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.open(mailtoLink);
      
      toast({
        title: '이메일 공유 창이 열렸습니다',
        description: '받는 사람을 입력하고 전송해주세요',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  // 팀에서 선수 제거
  const handleRemoveFromTeam = (playerId: string, team: 'A' | 'B') => {
    if (team === 'A') {
      setTeamA(prev => prev.filter(p => p.id !== playerId));
    } else {
      setTeamB(prev => prev.filter(p => p.id !== playerId));
    }

    // 축구장 위 위치도 제거
    setPlayerPositions(prev => prev.filter(p => p.id !== playerId));

    toast({
      title: '팀에서 선수가 제거되었습니다',
      status: 'info',
      duration: 2000,
      isClosable: true,
    });
  };

  // 경기 리셋
  const handleResetGame = () => {
    setTeamA([]);
    setTeamB([]);
    setPlayerPositions([]);
    setSelectedPlayers(new Set());
    setSelectedTeam(null);

    console.log('🔄 경기 리셋 완료 - 팀 배정 초기화');

    toast({
      title: '경기가 리셋되었습니다',
      description: '모든 팀 배정이 초기화되었습니다',
      status: 'info',
      duration: 2000,
      isClosable: true,
    });
  };

  // 선수 선택 토글 (pill 클릭으로 변경)
  const handlePlayerSelect = (playerId: string) => {
    // 이미 팀에 배정된 선수는 선택할 수 없음
    const isInTeamA = teamA.some(p => p.id === playerId);
    const isInTeamB = teamB.some(p => p.id === playerId);
    
    if (isInTeamA || isInTeamB) {
      toast({
        title: '이미 팀에 배정된 선수입니다',
        description: '팀에서 제거한 후 다시 선택해주세요',
        status: 'warning',
        duration: 2000,
        isClosable: true,
      });
      return;
    }

    setSelectedPlayers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(playerId)) {
        newSet.delete(playerId);
        console.log('❌ 선수 선택 해제:', playerId);
      } else {
        newSet.add(playerId);
        console.log('✅ 선수 선택:', playerId);
      }
      return newSet;
    });
  };

  // 드래그 시작 (Pointer Events: 마우스/터치/펜 공통 처리)
  const handleDragStart = (e: React.PointerEvent, playerId: string) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDraggedPlayer(playerId);

    const rect = fieldRef.current?.getBoundingClientRect();
    if (rect) {
      const position = playerPositions.find(p => p.id === playerId);
      if (position) {
        // 마우스 위치와 선수 위치의 차이를 정확하게 계산
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const playerX = (position.x / 100) * rect.width;
        const playerY = (position.y / 100) * rect.height;
        
        setDragOffset({
          x: mouseX - playerX,
          y: mouseY - playerY
        });
        
        console.log('🎯 드래그 시작:', {
          playerId,
          mousePos: { x: mouseX, y: mouseY },
          playerPos: { x: playerX, y: playerY },
          offset: { x: mouseX - playerX, y: mouseY - playerY }
        });
      }
    }
  };

  // 드래그 중
  const handleDrag = (e: React.PointerEvent) => {
    if (!draggedPlayer || !fieldRef.current) return;

    const rect = fieldRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // 드래그 오프셋을 고려한 정확한 위치 계산
    const actualX = mouseX - dragOffset.x;
    const actualY = mouseY - dragOffset.y;
    
    // 퍼센트로 변환
    const xPercent = (actualX / rect.width) * 100;
    const yPercent = (actualY / rect.height) * 100;

    // 경계 내로 제한
    const clampedX = Math.max(5, Math.min(95, xPercent));
    const clampedY = Math.max(5, Math.min(95, yPercent));

    setPlayerPositions(prev => 
      prev.map(pos => 
        pos.id === draggedPlayer 
          ? { ...pos, x: clampedX, y: clampedY }
          : pos
      )
    );
  };

  // 드래그 종료
  const handleDragEnd = () => {
    if (draggedPlayer) {
      console.log('🏁 드래그 종료:', draggedPlayer);
    }
    setDraggedPlayer(null);
  };

  // ── 표시 전용 헬퍼 (상태·로직은 위 핸들러를 그대로 호출) ──────────────────
  // 팀 색: A = Brand Blue, B = Orange (Volt와 겹치는 노랑 계열은 쓰지 않음)
  const TEAM_TONE = {
    A: { solid: 'brand.500', soft: 'brand.50', border: 'brand.300', text: 'brand.700', scheme: 'brand' },
    B: { solid: 'orange.600', soft: 'orange.50', border: 'orange.300', text: 'orange.700', scheme: 'orange' },
  } as const;

  // 회원명단 선수 칩 (투표한 인원 / 투표하지 않은 인원 / 전체 명단 공용)
  const renderPlayerChip = (player: Player, variant: 'voted' | 'rest') => {
    const isSelected = selectedPlayers.has(player.id);
    const isInTeamA = teamA.some(p => p.id === player.id);
    const isInTeamB = teamB.some(p => p.id === player.id);
    const isGuestPlayer = String(player.id).startsWith('guest_');
    const assigned = isInTeamA ? TEAM_TONE.A : isInTeamB ? TEAM_TONE.B : null;
    const selectedTone = selectedTeam ? TEAM_TONE[selectedTeam] : null;

    if (editingGuestPlayer?.id === player.id) {
      return (
        <HStack key={player.id} spacing={1}>
          <Input value={editGuestPlayerName} onChange={(e) => setEditGuestPlayerName(e.target.value)} size="sm" h="44px" />
          <IconButton aria-label="용병 이름 저장" icon={<CheckIcon />} size="sm" h="44px" minW="40px" onClick={handleSaveEditGuestPlayer} colorScheme="brand" />
          <IconButton aria-label="용병 이름 수정 취소" icon={<CloseIcon />} size="sm" h="44px" minW="40px" onClick={handleCancelEditGuestPlayer} variant="outline" colorScheme="gray" />
        </HStack>
      );
    }

    return (
      <HStack key={player.id} spacing={1} minW={0}>
        <Button
          flex={1}
          minW={0}
          h="auto"
          minH="44px"
          px={2}
          py={1.5}
          borderRadius="md"
          border="1px solid"
          onClick={() => handlePlayerSelect(player.id)}
          isDisabled={!selectedTeam || isInTeamA || isInTeamB}
          bg={assigned ? assigned.soft : isSelected && selectedTone ? selectedTone.solid : variant === 'voted' ? 'white' : 'gray.50'}
          borderColor={assigned ? assigned.border : isSelected && selectedTone ? selectedTone.solid : variant === 'voted' ? 'gray.300' : 'gray.200'}
          color={assigned ? assigned.text : isSelected ? 'white' : variant === 'voted' ? 'matchday.navy' : 'gray.600'}
          fontSize="sm"
          fontWeight="700"
          whiteSpace="normal"
          wordBreak="keep-all"
          lineHeight="1.2"
          transition="background-color 0.15s, border-color 0.15s"
          _hover={{ borderColor: selectedTone ? selectedTone.solid : 'gray.400' }}
          _disabled={{ opacity: assigned ? 1 : 0.55, cursor: 'not-allowed' }}
        >
          {player.name}
        </Button>
        {isGuestPlayer && (
          <IconButton
            aria-label={`${player.name} 이름 수정`}
            icon={<EditIcon />}
            size="sm"
            h="44px"
            minW="36px"
            variant="outline"
            colorScheme="brand"
            onClick={(e) => {
              e.stopPropagation();
              const newName = prompt('용병 이름을 입력하세요:', player.name);
              if (newName && newName.trim()) {
                const trimmedName = newName.trim();

                // guestPlayerNames에 저장
                setGuestPlayerNames(prev => ({
                  ...prev,
                  [player.id]: trimmedName
                }));

                // memberList 업데이트
                setMemberList(prev => prev.map(p =>
                  p.id === player.id ? { ...p, name: trimmedName } : p
                ));
                // 팀에서도 업데이트
                setTeamA(prev => prev.map(p =>
                  p.id === player.id ? { ...p, name: trimmedName } : p
                ));
                setTeamB(prev => prev.map(p =>
                  p.id === player.id ? { ...p, name: trimmedName } : p
                ));
              }
            }}
          />
        )}
      </HStack>
    );
  };

  // 팀 현황 칩 (이름 + 팀에서 제거)
  const renderTeamChip = (player: Player, team: 'A' | 'B') => {
    const tone = TEAM_TONE[team];
    return (
      <Flex key={player.id} align="center" minH="44px" pl={3} pr={1} borderRadius="md" border="1px solid" borderColor={tone.border} bg={tone.soft} minW={0}>
        <Text flex={1} minW={0} fontSize="sm" fontWeight="700" color={tone.text} wordBreak="keep-all" lineHeight="1.2">{player.name}</Text>
        <IconButton
          aria-label={`${player.name} ${team}팀에서 제거`}
          icon={<DeleteIcon />}
          size="sm"
          minW="32px"
          h="32px"
          variant="ghost"
          colorScheme="red"
          color="red.500"
          onClick={() => handleRemoveFromTeam(player.id, team)}
        />
      </Flex>
    );
  };

  // 보드 위 선수 토큰 — 좌표 기준(left/top = 토큰 좌상단)은 기존과 동일하게 유지
  const renderFieldToken = (player: Player, team: 'A' | 'B') => {
    const position = playerPositions.find(p => p.id === player.id);
    if (!position) return null;
    const tone = TEAM_TONE[team];
    const isDragging = draggedPlayer === player.id;

    return (
      <Box
        key={`${team}-${player.id}`}
        position="absolute"
        left={`${position.x}%`}
        top={`${position.y}%`}
        w="50px"
        h="50px"
        bg={tone.solid}
        borderRadius="full"
        border="2px solid"
        borderColor="white"
        display="flex"
        alignItems="center"
        justifyContent="center"
        cursor="grab"
        sx={{ touchAction: 'none' }}
        zIndex={isDragging ? 2 : 1}
        {...(isDragging ? { transform: 'scale(1.08)' } : {})}
        _hover={{ transform: 'scale(1.08)' }}
        transition="transform 0.15s, box-shadow 0.15s"
        boxShadow={isDragging ? '0 0 0 3px rgba(215,255,58,0.85), 0 8px 18px rgba(0,0,0,0.45)' : '0 4px 12px rgba(0,0,0,0.35)'}
        onPointerDown={(e) => handleDragStart(e, player.id)}
        _active={{ cursor: 'grabbing' }}
      >
        <Text fontSize="xs" fontWeight="800" color="white" textAlign="center" lineHeight="1.1" px={0.5} wordBreak="keep-all">
          {player.name}
        </Text>
      </Box>
    );
  };

  const playerGridColumns = { base: 3, sm: 4, md: 6 };

  return (
    <VStack className="fccg-matchday fccg-admin" spacing={5} align="stretch" w="100%">
      <AdminPageHeader eyebrow="TACTICAL BOARD" title="풋살 현황판" description="선수 배치와 포지션을 관리합니다." />

      {/* 경기 날짜 선택 및 팀 구성 공유 */}
      <AdminPanel label="MATCH SETUP" title="경기 날짜 · 팀 구성 공유">
        <Flex direction={{ base: 'column', md: 'row' }} gap={4} align={{ base: 'stretch', md: 'flex-end' }}>
          <FormControl flex="1">
            <FormLabel fontSize="sm" color="gray.700">확정된 경기 날짜</FormLabel>
            <Select
              placeholder="경기 날짜를 선택하세요"
              value={selectedGameDate}
              onChange={(e) => {
                console.log('🗓️ 날짜 선택:', e.target.value);
                setSelectedGameDate(e.target.value);
                localStorage.setItem('futsalSelectedGameDate', e.target.value);
              }}
              focusBorderColor="brand.500"
            >
              {getConfirmedGames().map((game) => (
                <option key={game.id} value={game.date}>
                  {new Date(game.date).toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    weekday: 'long'
                  })}
                </option>
              ))}
            </Select>
          </FormControl>

          <HStack spacing={2}>
            <Button
              variant="outline"
              colorScheme="gray"
              onClick={() => shareTeamComposition('kakao')}
              isDisabled={teamA.length === 0 && teamB.length === 0}
              flex={{ base: 1, md: 'none' }}
            >
              카카오톡 공유
            </Button>
            <Button
              variant="outline"
              colorScheme="brand"
              onClick={() => shareTeamComposition('email')}
              isDisabled={teamA.length === 0 && teamB.length === 0}
              flex={{ base: 1, md: 'none' }}
            >
              이메일 공유
            </Button>
          </HStack>
        </Flex>
      </AdminPanel>

      {/* 팀 선택 및 배정 */}
      <AdminPanel label="TEAM SELECT" title="팀 선택 및 배정">
        <SimpleGrid columns={2} spacing={3}>
          {(['A', 'B'] as const).map((team) => {
            const tone = TEAM_TONE[team];
            const isActive = selectedTeam === team;
            return (
              <Button
                key={team}
                h="56px"
                borderRadius="md"
                border="2px solid"
                borderColor={tone.solid}
                bg={isActive ? tone.solid : 'white'}
                color={isActive ? 'white' : tone.text}
                _hover={{ bg: isActive ? tone.solid : tone.soft }}
                transition="background-color 0.15s"
                onClick={() => setSelectedTeam(team)}
                aria-pressed={isActive}
              >
                <Text textStyle="scoreLabel" color={isActive ? 'whiteAlpha.800' : tone.text} mr={2}>TEAM</Text>
                <Text fontSize="xl" fontWeight="800">{team}팀</Text>
              </Button>
            );
          })}
        </SimpleGrid>

        {selectedTeam ? (
          <Flex mt={4} align="center" justify="space-between" gap={3} wrap="wrap">
            <Text fontSize="sm" color="gray.600">
              <Text as="span" fontWeight="800" color={TEAM_TONE[selectedTeam].text}>{selectedTeam}팀</Text> 선택됨 · 아래에서 선수들을 선택 후 팀 배정하세요
            </Text>
            {selectedPlayers.size > 0 && (
              <Button colorScheme={TEAM_TONE[selectedTeam].scheme} onClick={handleAssignTeam} minH="44px">
                {selectedTeam === 'A' ? 'A팀' : 'B팀'}에 {selectedPlayers.size}명 배정
              </Button>
            )}
          </Flex>
        ) : (
          <Text mt={4} fontSize="sm" color="gray.500">먼저 배정할 팀을 선택하세요.</Text>
        )}
      </AdminPanel>

      {/* 회원명단 */}
      <AdminPanel label="ROSTER" title="회원명단">
        {selectedGameDate && (() => {
          const { votedMembers, nonVotedMembers } = getVotedAndNonVotedMembers();

          return (
            <VStack align="stretch" spacing={4}>
              <Box>
                <HStack spacing={2} mb={2}>
                  <Text fontSize="sm" fontWeight="800" color="matchday.navy">투표한 인원</Text>
                  <Text textStyle="statNumber" fontSize="20px" color="brand.500">{votedMembers.length}</Text>
                  <Text fontSize="xs" color="gray.500">명</Text>
                </HStack>
                <SimpleGrid columns={playerGridColumns} spacing={2}>
                  {votedMembers.map((player) => renderPlayerChip(player, 'voted'))}
                </SimpleGrid>
              </Box>

              {/* 나머지 인원 섹션 */}
              {nonVotedMembers.length > 0 && (
                <Box pt={4} borderTop="1px dashed" borderColor="gray.200">
                  <HStack spacing={2} mb={2}>
                    <Text fontSize="sm" fontWeight="800" color="gray.600">투표하지 않은 인원</Text>
                    <Text textStyle="statNumber" fontSize="20px" color="gray.400">{nonVotedMembers.length}</Text>
                    <Text fontSize="xs" color="gray.500">명</Text>
                  </HStack>
                  <SimpleGrid columns={playerGridColumns} spacing={2}>
                    {nonVotedMembers.map((player) => renderPlayerChip(player, 'rest'))}
                  </SimpleGrid>
                </Box>
              )}
            </VStack>
          );
        })()}

        {/* 날짜가 선택되지 않은 경우 전체 회원명단 표시 */}
        {!selectedGameDate && (
          <SimpleGrid columns={playerGridColumns} spacing={2}>
            {memberList.map((player) => renderPlayerChip(player, 'rest'))}
          </SimpleGrid>
        )}
      </AdminPanel>

      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={3}>
        {/* 수기입력 */}
        <AdminPanel label="MANUAL" title="수기 입력 선수">
          <FormControl>
            <FormLabel fontSize="sm" color="gray.700">선수명</FormLabel>
            <HStack spacing={2}>
              <Input
                placeholder="이름"
                value={newPlayerName}
                onChange={(e) => setNewPlayerName(e.target.value)}
                focusBorderColor="brand.500"
              />
              <Button
                colorScheme="brand"
                onClick={handleAddManualPlayer}
                isDisabled={!newPlayerName.trim()}
                leftIcon={<AddIcon />}
                flexShrink={0}
              >
                추가
              </Button>
            </HStack>
          </FormControl>

          {/* 수기 입력 인원 목록 */}
          {memberList.filter(player => String(player.id).startsWith('manual_')).length > 0 && (
            <Box mt={4}>
              <Text fontSize="xs" fontWeight="700" mb={2} color="gray.500">수기 입력 인원 목록</Text>
              <VStack spacing={2} align="stretch">
                {memberList
                  .filter(player => String(player.id).startsWith('manual_'))
                  .map((player) => (
                    <Box key={player.id}>
                      {editingPlayer?.id === player.id ? (
                        // 수정 모드
                        <HStack spacing={2}>
                          <Input
                            value={editPlayerName}
                            onChange={(e) => setEditPlayerName(e.target.value)}
                            placeholder="수정할 이름"
                            focusBorderColor="brand.500"
                          />
                          <Button colorScheme="brand" onClick={handleSaveEdit} isDisabled={!editPlayerName.trim()} flexShrink={0}>
                            저장
                          </Button>
                          <Button variant="outline" colorScheme="gray" onClick={handleCancelEdit} flexShrink={0}>
                            취소
                          </Button>
                        </HStack>
                      ) : (
                        // 일반 모드
                        <Flex align="center" justify="space-between" gap={2} minH="44px" pl={3} pr={1} border="1px solid" borderColor="gray.200" borderRadius="md">
                          <Text fontSize="sm" fontWeight="700" color="matchday.navy">
                            {player.name}
                            {player.team && (
                              <Text as="span" fontSize="xs" fontWeight="600" color={TEAM_TONE[player.team].text} ml={2}>
                                {player.team}팀
                              </Text>
                            )}
                          </Text>
                          <HStack spacing={1}>
                            <IconButton
                              aria-label={`${player.name} 이름 수정`}
                              icon={<EditIcon />}
                              size="sm"
                              colorScheme="brand"
                              variant="ghost"
                              onClick={() => handleStartEdit(player)}
                            />
                            <IconButton
                              aria-label={`${player.name} 삭제`}
                              icon={<DeleteIcon />}
                              size="sm"
                              colorScheme="red"
                              variant="ghost"
                              color="red.500"
                              onClick={() => setConfirmDialog({ type: 'deletePlayer', player })}
                            />
                          </HStack>
                        </Flex>
                      )}
                    </Box>
                  ))}
              </VStack>
            </Box>
          )}
        </AdminPanel>

        {/* 팀 현황 */}
        <AdminPanel label="LINEUP" title="팀 현황">
          <VStack align="stretch" spacing={4}>
            {(['A', 'B'] as const).map((team) => {
              const list = team === 'A' ? teamA : teamB;
              const tone = TEAM_TONE[team];
              return (
                <Box key={team}>
                  <HStack spacing={2} mb={2}>
                    <Box w="10px" h="10px" borderRadius="full" bg={tone.solid} />
                    <Text fontSize="sm" fontWeight="800" color={tone.text}>{team}팀</Text>
                    <Text textStyle="statNumber" fontSize="20px" color={tone.text}>{list.length}</Text>
                    <Text fontSize="xs" color="gray.500">명</Text>
                  </HStack>
                  {list.length === 0 ? (
                    <Text fontSize="sm" color="gray.400">배정된 선수 없음</Text>
                  ) : (
                    <SimpleGrid columns={{ base: 3, sm: 4 }} spacing={2}>
                      {list.map((player) => renderTeamChip(player, team))}
                    </SimpleGrid>
                  )}
                </Box>
              );
            })}

            {/* 경기 리셋 */}
            <Button
              variant="outline"
              colorScheme="gray"
              onClick={() => setConfirmDialog({ type: 'reset' })}
              isDisabled={teamA.length === 0 && teamB.length === 0}
              alignSelf="flex-start"
            >
              경기 리셋
            </Button>
          </VStack>
        </AdminPanel>
      </SimpleGrid>

      {/* 포지션 — 전술 보드 */}
      <AdminPanel label="FORMATION" title="포지션">
        {/* 스코어보드형 팀 인원 */}
        <Flex align="center" justify="space-between" bg="matchday.navy" color="white" borderRadius="md" px={{ base: 3, md: 5 }} py={2.5} mb={3}>
          <HStack spacing={2}>
            <Box w="10px" h="10px" borderRadius="full" bg={TEAM_TONE.A.solid} border="1px solid" borderColor="whiteAlpha.700" />
            <Text textStyle="scoreLabel" color="whiteAlpha.800">TEAM A</Text>
            <Text textStyle="statNumber" fontSize="28px">{teamA.length}</Text>
          </HStack>
          <Text textStyle="scoreLabel" color="whiteAlpha.500">VS</Text>
          <HStack spacing={2}>
            <Text textStyle="statNumber" fontSize="28px">{teamB.length}</Text>
            <Text textStyle="scoreLabel" color="whiteAlpha.800">TEAM B</Text>
            <Box w="10px" h="10px" borderRadius="full" bg={TEAM_TONE.B.solid} border="1px solid" borderColor="whiteAlpha.700" />
          </HStack>
        </Flex>

        {/* 경기장 — 모든 라인은 % 기반 (반응형) */}
        <Box
          ref={fieldRef}
          position="relative"
          w="100%"
          sx={{ aspectRatio: { base: '1 / 1', sm: '3 / 2', md: '2 / 1' } }}
          bg="matchday.navy"
          backgroundImage="repeating-linear-gradient(90deg, rgba(255,255,255,0.035) 0 10%, transparent 10% 20%)"
          borderRadius="lg"
          overflow="hidden"
          onPointerMove={handleDrag}
          onPointerUp={handleDragEnd}
          onPointerCancel={handleDragEnd}
          cursor={draggedPlayer ? 'grabbing' : 'default'}
        >
          <Box position="absolute" inset="3%" border="2px solid" borderColor="whiteAlpha.500" borderRadius="sm" pointerEvents="none">
            {/* 중앙선 */}
            <Box position="absolute" top={0} bottom={0} left="50%" w="2px" bg="whiteAlpha.500" transform="translateX(-50%)" />
            {/* 센터 서클 · 센터 스팟 */}
            <Box position="absolute" top="50%" left="50%" h="32%" sx={{ aspectRatio: '1 / 1' }} border="2px solid" borderColor="whiteAlpha.500" borderRadius="full" transform="translate(-50%, -50%)" />
            <Box position="absolute" top="50%" left="50%" w="6px" h="6px" bg="whiteAlpha.700" borderRadius="full" transform="translate(-50%, -50%)" />
            {/* 페널티 에리어 */}
            <Box position="absolute" top="20%" left={0} w="15%" h="60%" border="2px solid" borderLeft={0} borderColor="whiteAlpha.500" />
            <Box position="absolute" top="20%" right={0} w="15%" h="60%" border="2px solid" borderRight={0} borderColor="whiteAlpha.500" />
            {/* 골 에리어 */}
            <Box position="absolute" top="35%" left={0} w="5%" h="30%" border="2px solid" borderLeft={0} borderColor="whiteAlpha.500" />
            <Box position="absolute" top="35%" right={0} w="5%" h="30%" border="2px solid" borderRight={0} borderColor="whiteAlpha.500" />
          </Box>
          <Text position="absolute" left="4.5%" bottom="5%" textStyle="scoreLabel" fontSize="10px" color="whiteAlpha.500" pointerEvents="none">TEAM A</Text>
          <Text position="absolute" right="4.5%" bottom="5%" textStyle="scoreLabel" fontSize="10px" color="whiteAlpha.500" pointerEvents="none">TEAM B</Text>

          {/* A팀 / B팀 선수들 (드래그 가능) */}
          {teamA.map((player) => renderFieldToken(player, 'A'))}
          {teamB.map((player) => renderFieldToken(player, 'B'))}
        </Box>
        <Text fontSize="xs" color="gray.500" mt={2}>선수 토큰을 끌어서 위치를 옮길 수 있습니다. 위치는 이 브라우저에 저장됩니다.</Text>
      </AdminPanel>

      {/* 선수 삭제 / 경기 리셋 확인 모달 */}
      <Modal isOpen={!!confirmDialog} onClose={() => setConfirmDialog(null)}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            {confirmDialog?.type === 'deletePlayer' ? '선수 삭제 확인' : '경기 리셋 확인'}
          </ModalHeader>
          <ModalBody>
            <Text fontSize="sm" color="gray.700">
              {confirmDialog?.type === 'deletePlayer'
                ? `"${confirmDialog.player.name}" 선수를 삭제하시겠습니까? 팀 배정과 보드 위치에서도 함께 제거됩니다.`
                : '현재 팀 배정과 보드 위치가 모두 초기화됩니다. 이 브라우저에만 저장된 내용이며 되돌릴 수 없습니다.'}
            </Text>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={2} onClick={() => setConfirmDialog(null)}>
              취소
            </Button>
            <Button
              colorScheme="red"
              onClick={() => {
                if (confirmDialog?.type === 'deletePlayer') {
                  handleDeleteManualPlayer(confirmDialog.player);
                } else if (confirmDialog?.type === 'reset') {
                  handleResetGame();
                }
                setConfirmDialog(null);
              }}
            >
              {confirmDialog?.type === 'deletePlayer' ? '삭제' : '리셋'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </VStack>
  );
}
