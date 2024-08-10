import React, { useCallback } from "react";
import DraggableFlatList from "react-native-draggable-flatlist";
import TemplateCard from "./TemplateCard";
import { View } from "react-native";

const TemplateList = ({ templates, setTemplates, isPanelVisible, setSelectedScheduleTemplate, openEditTemplateBottomSheet, startWorkoutFromTemplate }) => {

    const renderItem = useCallback(({ item, drag }) => {
        const index = templates.findIndex(template => template.tid === item.tid);
        return (
            <TemplateCard
                template={item}
                handleLongPress={drag}
                isPanelVisible={isPanelVisible}
                setSelectedTemplate={setSelectedScheduleTemplate}
                handlePressEditButton={() => openEditTemplateBottomSheet(index)}
                handlePressStartButton={() => startWorkoutFromTemplate(index)}
                index={index}
            />
        );
    }, [isPanelVisible, setSelectedScheduleTemplate, openEditTemplateBottomSheet, templates]);

    return (
        <DraggableFlatList
            data={templates}
            onDragEnd={({ data }) => setTemplates(data)}
            keyExtractor={(item) => item.tid}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            ListFooterComponent={<View />}
            ListFooterComponentStyle={{ height: templates.length * 70 }}
        />
    );
};

export default TemplateList;
