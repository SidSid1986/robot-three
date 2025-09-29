<template>
  <div class="container">
    <div class="left">
      <BallOne @getTrajectory="getTrajectory" />
    </div>
    <div class="right">
      <BallTwo :trajectory="trajectory" />
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from "vue";
import BallOne from "@/components/BallOne.vue";
import BallTwo from "@/components/BallTwo.vue";

const trajectory = ref([]);

const getTrajectory = (data) => {
  trajectory.value = data;
};

onMounted(() => {
  console.log("组件挂载了");
});
</script>

<style scoped lang="scss">
.container {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  box-sizing: border-box;

  .left {
    width: 50%;
    height: 100vh;
    border: 3px solid pink;
    box-sizing: border-box;
  }
  .right {
    width: 50%;
    height: 100vh;
    border: 3px solid green;

    box-sizing: border-box;
  }
}
</style>
