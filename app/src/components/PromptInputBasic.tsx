import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function PromptInputBasic() {
  const [prompt, setPrompt] = useState('');
  const router = useRouter();

  const handleSend = () => {
    if (prompt.trim()) {
      router.push(`/ai?q=${encodeURIComponent(prompt)}`);
    }
  };

  return (
    <View className="w-full bg-white/10 rounded-full flex-row items-center p-2 my-4">
      <TextInput
        className="flex-1 text-white text-base pl-3"
        placeholder="Ask rainiX AI about the weather..."
        placeholderTextColor="rgba(255,255,255,0.6)"
        value={prompt}
        onChangeText={setPrompt}
        onSubmitEditing={handleSend}
      />
      <TouchableOpacity 
        className="bg-white p-2.5 rounded-full ml-2"
        onPress={handleSend}
      >
        <Feather name="arrow-up" size={18} color="#1e293b" />
      </TouchableOpacity>
    </View>
  );
}
